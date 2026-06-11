export interface SessionInfo {
	id: string;
	name: string | null;
	path: string;
	cwd: string;
	firstMessage: string;
	messageCount: number;
	created: string;
	modified: string;
}

export const fetchSessions = async (): Promise<SessionInfo[]> => {
	const response = await fetch("/api/sessions");

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `HTTP ${response.status}`);
	}

	return response.json();
};

export const switchSession = async (id: string): Promise<void> => {
	const response = await fetch(`/api/sessions/${id}/switch`, { method: "POST" });

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `HTTP ${response.status}`);
	}
};

export const deleteSession = async (id: string): Promise<void> => {
	const response = await fetch(`/api/sessions/${id}`, { method: "DELETE" });

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `HTTP ${response.status}`);
	}
};

export const renameSession = async (id: string, name: string): Promise<void> => {
	const response = await fetch(`/api/sessions/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name }),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `HTTP ${response.status}`);
	}
};

export const newSession = async (): Promise<void> => {
	const response = await fetch("/api/sessions/new", { method: "POST" });

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `HTTP ${response.status}`);
	}
};

export const resetSession = async (): Promise<void> => {
	const response = await fetch("/api/session", { method: "DELETE" });

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `HTTP ${response.status}`);
	}
};
