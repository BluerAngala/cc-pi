export interface ToolCall {
	label: string;
	durationMs: number;
}

export interface Message {
	role: "user" | "assistant";
	content: string;
	elapsedMs?: number;
	toolCalls?: ToolCall[];
	thinkingMs?: number;
	streamingMs?: number;
}

export function formatElapsed(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) return "0ms";
	if (ms < 1000) return `${Math.round(ms)}ms`;
	const s = (ms / 1000).toFixed(1);
	if (ms < 60_000) return `${s}s`;
	const min = Math.floor(ms / 60_000);
	const sec = Math.floor((ms % 60_000) / 1000);
	return `${min}分${sec}秒`;
}

function formatAssistantFooter(message: Message): string {
	if (message.elapsedMs === undefined) return "";
	const lines: string[] = [];
	if (message.thinkingMs !== undefined && message.thinkingMs > 0) {
		lines.push(`思考耗时: ${formatElapsed(message.thinkingMs)}`);
	}
	if (message.toolCalls && message.toolCalls.length > 0) {
		lines.push(
			`工具调用: ${message.toolCalls
				.map((tc) => `${tc.label} ${formatElapsed(tc.durationMs)}`)
				.join(", ")}`,
		);
	}
	if (message.streamingMs !== undefined && message.streamingMs > 0) {
		lines.push(`回答耗时: ${formatElapsed(message.streamingMs)}`);
	}
	lines.push(`总耗时: ${formatElapsed(message.elapsedMs)}`);
	return `\n\n---\n${lines.join("\n")}`;
}

export function formatMessageForCopy(message: Message): string {
	const role = message.role === "user" ? "User" : "Assistant";
	const body =
		message.role === "assistant" ? `${message.content}${formatAssistantFooter(message)}` : message.content;
	return `${role}:\n${body}`;
}

export function formatMessagesForCopy(messages: Message[]): string {
	return messages.map(formatMessageForCopy).join("\n\n---\n\n");
}
