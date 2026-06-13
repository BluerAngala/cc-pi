export interface ToolCall {
	label: string;
	durationMs: number;
}

export interface Source {
	title: string;
	url: string;
	cite?: string;
	snippet?: string;
}

export interface Message {
	role: "user" | "assistant";
	content: string;
	elapsedMs?: number;
	toolCalls?: ToolCall[];
	thinkingMs?: number;
	streamingMs?: number;
	sources?: Source[];
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
	if (message.elapsedMs !== undefined) {
		lines.push(`总耗时: ${formatElapsed(message.elapsedMs)}`);
	}
	if (message.sources && message.sources.length > 0) {
		lines.push(
			`来源:\n${message.sources
				.map((s, i) => `  ${i + 1}. ${s.title}\n     ${s.url}${s.cite ? ` (${s.cite})` : ""}`)
				.join("\n")}`,
		);
	}
	if (lines.length === 0) return "";
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

/**
 * Replaces inline citation markers like `[1]`, `[2]` in the assistant's content
 * with markdown links to the corresponding source URL, so users can jump to the
 * original article. Markers that don't have a matching source are left alone.
 */
export function linkifyCitations(content: string, sources: Source[] | undefined): string {
	if (!sources || sources.length === 0) return content;
	return content.replace(/\[(\d+)\](?!\()/g, (match, numStr) => {
		const idx = Number.parseInt(numStr, 10) - 1;
		if (idx >= 0 && idx < sources.length && sources[idx]) {
			return `[${numStr}](${sources[idx]!.url})`;
		}
		return match;
	});
}
