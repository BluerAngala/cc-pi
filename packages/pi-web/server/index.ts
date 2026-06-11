import { createAgentSession, SessionManager, type AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import express from "express";
import { readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";

const getCwd = () => process.env.PI_WEB_CWD ?? resolve(process.cwd(), "..", "..");
const getAgentDir = () => process.env.PI_WEB_AGENT_DIR;

// Single active session (the one currently connected to chat)
let activeSessionPromise: ReturnType<typeof createAgentSession> | undefined;

const disposeActiveSession = async () => {
	if (!activeSessionPromise) return;
	const result = await activeSessionPromise;
	result.session.dispose();
	activeSessionPromise = undefined;
};

const getOrCreateSession = async (sessionPath?: string) => {
	const cwd = getCwd();
	const agentDir = getAgentDir();

	if (activeSessionPromise) {
		const result = await activeSessionPromise;
		// If no specific session requested, reuse current
		if (!sessionPath) {
			return result.session;
		}
		// If same session file, reuse
		if (result.session.sessionFile === sessionPath) {
			return result.session;
		}
		// Different session requested — dispose current
		result.session.dispose();
		activeSessionPromise = undefined;
	}

	const sessionManager = sessionPath
		? SessionManager.open(sessionPath, undefined, cwd)
		: SessionManager.continueRecent(cwd);

	activeSessionPromise = createAgentSession({ cwd, agentDir, sessionManager });
	const result = await activeSessionPromise;
	return result.session;
};

const app = express();
const apiPort = Number(process.env.PI_WEB_PORT ?? 3311);
const clientDistDir = resolve(process.cwd(), "packages/pi-web/dist-client");
const indexHtmlPath = resolve(clientDistDir, "index.html");

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
	res.json({ ok: true, cwd: getCwd() });
});

// List sessions
app.get("/api/sessions", async (_req, res) => {
	try {
		const cwd = getCwd();
		const sessions = await SessionManager.list(cwd);
		res.json(
			sessions.map((s) => ({
				id: s.id,
				name: s.name ?? null,
				path: s.path,
				cwd: s.cwd,
				firstMessage: s.firstMessage,
				messageCount: s.messageCount,
				created: s.created.toISOString(),
				modified: s.modified.toISOString(),
			})),
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		res.status(500).json({ error: message });
	}
});

// Switch to an existing session
app.post("/api/sessions/:id/switch", async (req, res) => {
	try {
		const { id } = req.params;
		const cwd = getCwd();
		const sessions = await SessionManager.list(cwd);
		const target = sessions.find((s) => s.id === id);

		if (!target) {
			res.status(404).json({ error: "Session not found" });
			return;
		}

		await getOrCreateSession(target.path);
		res.json({ ok: true, id: target.id });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		res.status(500).json({ error: message });
	}
});

// Delete a session
app.delete("/api/sessions/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const cwd = getCwd();
		const sessions = await SessionManager.list(cwd);
		const target = sessions.find((s) => s.id === id);

		if (!target) {
			res.status(404).json({ error: "Session not found" });
			return;
		}

		// If this is the active session, dispose it first
		if (activeSessionPromise) {
			const result = await activeSessionPromise;
			if (result.session.sessionFile === target.path) {
				await disposeActiveSession();
			}
		}

		await unlink(target.path);
		res.json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		res.status(500).json({ error: message });
	}
});

// Rename a session
app.patch("/api/sessions/:id", async (req, res) => {
	try {
		const { id } = req.params;
		const { name } = req.body as { name?: string };
		const cwd = getCwd();
		const sessions = await SessionManager.list(cwd);
		const target = sessions.find((s) => s.id === id);

		if (!target) {
			res.status(404).json({ error: "Session not found" });
			return;
		}

		// Open session, append session_info entry, close
		const sm = SessionManager.open(target.path, undefined, cwd);
		sm.appendSessionInfo(name ?? "");
		res.json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		res.status(500).json({ error: message });
	}
});

// Create new session (dispose current, start fresh)
app.post("/api/sessions/new", async (_req, res) => {
	try {
		await disposeActiveSession();
		const cwd = getCwd();
		const agentDir = getAgentDir();
		const sessionManager = SessionManager.create(cwd);
		activeSessionPromise = createAgentSession({ cwd, agentDir, sessionManager });
		await activeSessionPromise;
		res.json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		res.status(500).json({ error: message });
	}
});

// Reset current session (dispose and create fresh in-memory)
app.delete("/api/session", async (_req, res) => {
	await disposeActiveSession();
	res.json({ ok: true });
});

// Get current session messages for history loading
app.get("/api/session/messages", async (_req, res) => {
	try {
		const session = await getOrCreateSession();
		const entries = session.sessionManager.getEntries();
		const messages: Array<{ role: string; content: string }> = [];
		for (const entry of entries) {
			if (entry.type === "message") {
				const msg = (entry as { type: "message"; message: { role: string; content?: string | Array<{ type: string; text?: string }> } }).message;
				const role = msg.role === "user" ? "user" : "assistant";
				let text = "";
				if (typeof msg.content === "string") {
					text = msg.content;
				} else if (Array.isArray(msg.content)) {
					text = msg.content
						.filter((p): p is { type: string; text: string } => p.type === "text" && typeof p.text === "string")
						.map((p) => p.text)
						.join("");
				}
				if (text) {
					messages.push({ role, content: text });
				}
			}
		}
		res.json({ messages });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		res.status(500).json({ error: message });
	}
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
	try {
		const body = req.body as { messages?: Array<{ role?: string; content?: string }> };
		const lastUserMessage = body.messages?.filter((message) => message.role === "user").at(-1);

		if (!lastUserMessage?.content?.trim()) {
			res.status(400).json({ error: "Missing user message" });
			return;
		}

		const session = await getOrCreateSession();

		res.writeHead(200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		});

		const sendEvent = (event: Record<string, unknown>) => {
			res.write(`data: ${JSON.stringify(event)}\n\n`);
		};

		const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
			if (event.type === "message_update") {
				const assistantEvent = event.assistantMessageEvent;

				if (assistantEvent.type === "text_delta") {
					sendEvent({ type: "text_delta", delta: assistantEvent.delta });
					return;
				}

				if (assistantEvent.type === "toolcall_delta") {
					const toolCall = assistantEvent.partial.content?.find((part) => part.type === "toolCall");
					if (toolCall && "id" in toolCall && "name" in toolCall && toolCall.id && toolCall.name) {
						sendEvent({
							type: "tool_call",
							toolCallId: toolCall.id,
							toolName: toolCall.name,
						});
					}
				}

				return;
			}

			if (event.type === "tool_execution_start") {
				sendEvent({
					type: "tool_execution_start",
					toolCallId: event.toolCallId,
					toolName: event.toolName,
					args: event.args,
				});
				return;
			}

			if (event.type === "tool_execution_end") {
				sendEvent({
					type: "tool_execution_end",
					toolCallId: event.toolCallId,
					toolName: event.toolName,
					result: event.result,
					isError: event.isError,
				});
			}
		});

		const abort = () => {
			unsubscribe();
			res.end();
		};

		req.on("close", abort);

		try {
			await session.prompt(lastUserMessage.content);
			sendEvent({ type: "done" });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			sendEvent({ type: "error", message });
		} finally {
			req.off("close", abort);
			unsubscribe();
			res.end();
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		res.status(500).json({ error: message });
	}
});

if (process.env.NODE_ENV === "production") {
	app.use(express.static(clientDistDir));

	app.get(/^(?!\/api).*/, async (_req, res) => {
		const html = await readFile(indexHtmlPath, "utf8");
		res.type("html").send(html);
	});
}

app.listen(apiPort, "127.0.0.1", () => {
	console.log(`pi-web api listening on http://127.0.0.1:${apiPort}`);
});
