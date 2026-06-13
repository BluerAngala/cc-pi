import type { Message } from "./format.ts";

const DB_NAME = "pi-web";
const DB_VERSION = 1;
const STORE_CONVERSATIONS = "conversations";
const STORE_MESSAGES = "messages";

export interface Conversation {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
}

export interface StoredMessage {
	id: string;
	conversationId: string;
	order: number;
	role: "user" | "assistant";
	content: string;
	elapsedMs?: number;
	thinkingMs?: number;
	streamingMs?: number;
	toolCalls?: { label: string; durationMs: number }[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
				const conv = db.createObjectStore(STORE_CONVERSATIONS, { keyPath: "id" });
				conv.createIndex("updatedAt", "updatedAt");
			}
			if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
				const msg = db.createObjectStore(STORE_MESSAGES, { keyPath: "id" });
				msg.createIndex("conversationId", "conversationId");
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}

export async function __resetDbForTests(): Promise<void> {
	if (dbPromise) {
		const db = await dbPromise;
		db.close();
	}
	dbPromise = null;
}

function tx<T>(
	db: IDBDatabase,
	stores: string | string[],
	mode: IDBTransactionMode,
	fn: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(stores, mode);
		const result = fn(transaction);
		transaction.oncomplete = () => Promise.resolve(result).then(resolve, reject);
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function listConversations(): Promise<Conversation[]> {
	const db = await openDb();
	return tx(db, STORE_CONVERSATIONS, "readonly", (t) => {
		const store = t.objectStore(STORE_CONVERSATIONS);
		const req = store.index("updatedAt").getAll();
		return reqToPromise<Conversation[]>(req).then((list) =>
			list.sort((a, b) => b.updatedAt - a.updatedAt),
		);
	});
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
	const db = await openDb();
	return tx(db, STORE_CONVERSATIONS, "readonly", (t) => {
		const req = t.objectStore(STORE_CONVERSATIONS).get(id);
		return reqToPromise<Conversation | undefined>(req);
	});
}

export async function createConversation(conv: Conversation): Promise<void> {
	const db = await openDb();
	await tx(db, STORE_CONVERSATIONS, "readwrite", (t) => {
		t.objectStore(STORE_CONVERSATIONS).put(conv);
	});
}

export async function updateConversation(id: string, patch: Partial<Conversation>): Promise<void> {
	const db = await openDb();
	await tx(db, STORE_CONVERSATIONS, "readwrite", (t) => {
		const store = t.objectStore(STORE_CONVERSATIONS);
		const req = store.get(id);
		req.onsuccess = () => {
			const existing = req.result as Conversation | undefined;
			if (!existing) return;
			store.put({ ...existing, ...patch, id, updatedAt: patch.updatedAt ?? Date.now() });
		};
	});
}

export async function deleteConversation(id: string): Promise<void> {
	const db = await openDb();
	await tx(db, [STORE_CONVERSATIONS, STORE_MESSAGES], "readwrite", (t) => {
		t.objectStore(STORE_CONVERSATIONS).delete(id);
		const idx = t.objectStore(STORE_MESSAGES).index("conversationId");
		const req = idx.openCursor(IDBKeyRange.only(id));
		req.onsuccess = () => {
			const cursor = req.result;
			if (cursor) {
				cursor.delete();
				cursor.continue();
			}
		};
	});
}

export async function getMessages(conversationId: string): Promise<Message[]> {
	const db = await openDb();
	return tx(db, STORE_MESSAGES, "readonly", (t) => {
		const idx = t.objectStore(STORE_MESSAGES).index("conversationId");
		const req = idx.getAll(IDBKeyRange.only(conversationId));
		return reqToPromise<StoredMessage[]>(req).then((list) =>
			list
			.sort((a, b) => a.order - b.order)
			.map((m) => {
				const result: Message = { role: m.role, content: m.content };
				if (m.elapsedMs !== undefined) result.elapsedMs = m.elapsedMs;
				if (m.thinkingMs !== undefined) result.thinkingMs = m.thinkingMs;
				if (m.streamingMs !== undefined) result.streamingMs = m.streamingMs;
				if (m.toolCalls) result.toolCalls = m.toolCalls;
				return result;
			}),
		);
	});
}

export async function appendMessage(
	conversationId: string,
	order: number,
	message: Message,
): Promise<void> {
	const db = await openDb();
	const stored: StoredMessage = {
		id: `${conversationId}:${order}`,
		conversationId,
		order,
		role: message.role,
		content: message.content,
	};
	if (message.elapsedMs !== undefined) stored.elapsedMs = message.elapsedMs;
	if (message.thinkingMs !== undefined) stored.thinkingMs = message.thinkingMs;
	if (message.streamingMs !== undefined) stored.streamingMs = message.streamingMs;
	if (message.toolCalls) stored.toolCalls = message.toolCalls;
	await tx(db, STORE_MESSAGES, "readwrite", (t) => {
		t.objectStore(STORE_MESSAGES).put(stored);
	});
}

export async function replaceLastAssistant(
	conversationId: string,
	order: number,
	message: Message,
): Promise<void> {
	await appendMessage(conversationId, order, message);
}
