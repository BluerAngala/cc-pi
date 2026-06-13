import {
	createAgentSession,
	DefaultResourceLoader,
	getAgentDir,
	type AgentSession,
	SessionManager,
} from "@earendil-works/pi-coding-agent";
import { getModel } from "@earendil-works/pi-ai";
import webToolsExtension from "../extensions/web-tools.ts";
import { PI_WEB_CWD, PI_WEB_MODEL } from "./config.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SESSIONS = 20;

export function isValidConversationId(id: string): boolean {
	return UUID_RE.test(id);
}

interface SessionEntry {
	session: AgentSession;
	createdAt: number;
	lastUsedAt: number;
}

const sessions = new Map<string, SessionEntry>();

async function createSession(): Promise<AgentSession> {
	const loader = new DefaultResourceLoader({
		cwd: PI_WEB_CWD,
		agentDir: getAgentDir(),
		noExtensions: true,
		noSkills: true,
		noPromptTemplates: true,
		noThemes: true,
		noContextFiles: true,
		extensionFactories: [webToolsExtension],
		systemPromptOverride: () =>
			[
				"你是一个 AI 助手，用中文回答。工具的描述写了使用原则，调用前先读。",
				"连续 2 次搜索返回一样的结果就直接用已有信息回答。",
				"回答格式：每条信息包含标题、摘要、原文链接，类似搜索引擎结果页。",
			].join("\n"),
	});
	await loader.reload();

	let model: ReturnType<typeof getModel> | undefined;
	if (PI_WEB_MODEL) {
		const slashIdx = PI_WEB_MODEL.indexOf("/");
		if (slashIdx > 0) {
			model = getModel(
				PI_WEB_MODEL.slice(0, slashIdx) as never,
				PI_WEB_MODEL.slice(slashIdx + 1),
			);
		}
	}

	const { session } = await createAgentSession({
		sessionManager: SessionManager.inMemory(PI_WEB_CWD),
		resourceLoader: loader,
		model,
		thinkingLevel: "off",
	});
	return session;
}

async function getOrCreateEntry(conversationId: string): Promise<SessionEntry> {
	const existing = sessions.get(conversationId);
	if (existing) {
		existing.lastUsedAt = Date.now();
		return existing;
	}
	if (sessions.size >= MAX_SESSIONS) {
		let oldestKey: string | null = null;
		let oldestTime = Infinity;
		for (const [k, v] of sessions) {
			if (v.lastUsedAt < oldestTime) {
				oldestTime = v.lastUsedAt;
				oldestKey = k;
			}
		}
		if (oldestKey !== null) sessions.delete(oldestKey);
	}
	const session = await createSession();
	const entry: SessionEntry = { session, createdAt: Date.now(), lastUsedAt: Date.now() };
	sessions.set(conversationId, entry);
	return entry;
}

export async function getSession(conversationId: string): Promise<AgentSession> {
	if (!isValidConversationId(conversationId)) {
		throw new Error("Invalid conversation id");
	}
	const entry = await getOrCreateEntry(conversationId);
	return entry.session;
}

export function getSessionCount(): number {
	return sessions.size;
}
