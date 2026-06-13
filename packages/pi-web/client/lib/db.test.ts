import { beforeEach, describe, expect, it } from "vitest";
import {
	appendMessage,
	createConversation,
	deleteConversation,
	getConversation,
	getMessages,
	listConversations,
	updateConversation,
} from "./db";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

function makeConv(id: string, title: string, updatedAt: number) {
	return { id, title, createdAt: updatedAt, updatedAt };
}

beforeEach(async () => {
	await new Promise<void>((resolve) => {
		const req = indexedDB.deleteDatabase("pi-web");
		req.onsuccess = () => resolve();
		req.onerror = () => resolve();
		req.onblocked = () => resolve();
	});
});

describe("db.conversations", () => {
	it("creates and reads back", async () => {
		const c = makeConv(ID_A, "first", Date.now());
		await createConversation(c);
		const got = await getConversation(ID_A);
		expect(got?.title).toBe("first");
	});

	it("lists sorted by updatedAt desc", async () => {
		await createConversation(makeConv(ID_A, "a", 1000));
		await createConversation(makeConv(ID_B, "b", 2000));
		const list = await listConversations();
		expect(list.map((c) => c.id)).toEqual([ID_B, ID_A]);
	});

	it("updates title", async () => {
		await createConversation(makeConv(ID_A, "old", 1000));
		await updateConversation(ID_A, { title: "new" });
		const got = await getConversation(ID_A);
		expect(got?.title).toBe("new");
	});

	it("deletes a conversation and its messages", async () => {
		await createConversation(makeConv(ID_A, "x", 1000));
		await appendMessage(ID_A, 0, { role: "user", content: "hi" });
		await deleteConversation(ID_A);
		const got = await getConversation(ID_A);
		expect(got).toBeUndefined();
		const msgs = await getMessages(ID_A);
		expect(msgs).toEqual([]);
	});
});

describe("db.messages", () => {
	beforeEach(async () => {
		await createConversation(makeConv(ID_A, "x", Date.now()));
	});

	it("appends in order", async () => {
		await appendMessage(ID_A, 1, { role: "user", content: "u" });
		await appendMessage(ID_A, 0, { role: "assistant", content: "a" });
		const msgs = await getMessages(ID_A);
		expect(msgs.map((m) => m.content)).toEqual(["a", "u"]);
	});

	it("preserves assistant timing fields", async () => {
		await appendMessage(ID_A, 0, {
			role: "assistant",
			content: "x",
			elapsedMs: 5000,
			thinkingMs: 1000,
			streamingMs: 3000,
			toolCalls: [{ label: "search_web", durationMs: 1000 }],
		});
		const [m] = await getMessages(ID_A);
		expect(m.elapsedMs).toBe(5000);
		expect(m.thinkingMs).toBe(1000);
		expect(m.streamingMs).toBe(3000);
		expect(m.toolCalls).toEqual([{ label: "search_web", durationMs: 1000 }]);
	});

	it("isolates messages between conversations", async () => {
		await createConversation(makeConv(ID_B, "y", Date.now()));
		await appendMessage(ID_A, 0, { role: "user", content: "a" });
		await appendMessage(ID_B, 0, { role: "user", content: "b" });
		const a = await getMessages(ID_A);
		const b = await getMessages(ID_B);
		expect(a.map((m) => m.content)).toEqual(["a"]);
		expect(b.map((m) => m.content)).toEqual(["b"]);
	});

	it("upserts on duplicate order", async () => {
		await appendMessage(ID_A, 0, { role: "user", content: "v1" });
		await appendMessage(ID_A, 0, { role: "user", content: "v2" });
		const msgs = await getMessages(ID_A);
		expect(msgs).toHaveLength(1);
		expect(msgs[0]?.content).toBe("v2");
	});
});
