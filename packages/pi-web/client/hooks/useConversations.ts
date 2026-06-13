import { useCallback, useEffect, useState } from "react";
import {
	createConversation as dbCreate,
	deleteConversation as dbDelete,
	getConversation as dbGet,
	listConversations,
	updateConversation as dbUpdate,
	type Conversation,
} from "../lib/db";
import { generateId } from "../lib/id";

export function useConversations() {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [currentId, setCurrentId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		listConversations()
			.then((list) => {
				if (cancelled) return;
				setConversations(list);
				if (list.length > 0) setCurrentId(list[0]?.id ?? null);
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const reload = useCallback(async () => {
		const list = await listConversations();
		setConversations(list);
	}, []);

	const create = useCallback(async (): Promise<Conversation> => {
		const now = Date.now();
		const conv: Conversation = {
			id: generateId(),
			title: "新对话",
			createdAt: now,
			updatedAt: now,
		};
		await dbCreate(conv);
		setConversations((prev) => [conv, ...prev]);
		setCurrentId(conv.id);
		return conv;
	}, []);

	const switchTo = useCallback((id: string) => {
		setCurrentId(id);
	}, []);

	const touch = useCallback(async (id: string) => {
		await dbUpdate(id, { updatedAt: Date.now() });
		setConversations((prev) => {
			const updated = prev.map((c) => (c.id === id ? { ...c, updatedAt: Date.now() } : c));
			return updated.sort((a, b) => b.updatedAt - a.updatedAt);
		});
	}, []);

	const rename = useCallback(async (id: string, title: string) => {
		const trimmed = title.trim() || "新对话";
		await dbUpdate(id, { title: trimmed, updatedAt: Date.now() });
		setConversations((prev) =>
			prev.map((c) => (c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c)),
		);
	}, []);

	const remove = useCallback(async (id: string) => {
		await dbDelete(id);
		setConversations((prev) => {
			const next = prev.filter((c) => c.id !== id);
			if (currentId === id) setCurrentId(next[0]?.id ?? null);
			return next;
		});
	}, [currentId]);

	const ensureExists = useCallback(
		async (id: string) => {
			const existing = await dbGet(id);
			return existing !== undefined;
		},
		[],
	);

	const currentConversation = conversations.find((c) => c.id === currentId) ?? null;

	return {
		conversations,
		currentId,
		currentConversation,
		isLoading,
		create,
		switchTo,
		touch,
		rename,
		remove,
		reload,
		ensureExists,
	};
}
