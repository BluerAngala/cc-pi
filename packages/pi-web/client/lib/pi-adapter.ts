import type {
	ChatModelAdapter,
	ChatModelRunOptions,
	ChatModelRunResult,
	ThreadAssistantMessagePart,
	ToolCallMessagePart,
} from "@assistant-ui/react";
import type { ReadonlyJSONObject, ReadonlyJSONValue } from "assistant-stream/utils";

interface PiEvent {
	type: "text_delta" | "tool_call" | "tool_execution_start" | "tool_execution_end" | "done" | "error";
	delta?: string;
	message?: string;
	toolCallId?: string;
	toolName?: string;
	args?: unknown;
	result?: unknown;
	isError?: boolean;
}

const toReadonlyJsonValue = (value: unknown): ReadonlyJSONValue => {
	if (value === null || typeof value === "string" || typeof value === "boolean") {
		return value;
	}

	if (typeof value === "number") {
		return Number.isFinite(value) ? value : String(value);
	}

	if (Array.isArray(value)) {
		return value.map((entry) => toReadonlyJsonValue(entry));
	}

	if (typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, toReadonlyJsonValue(entry)]),
		) as ReadonlyJSONObject;
	}

	return String(value);
};

const toReadonlyJsonObject = (value: unknown): ReadonlyJSONObject => {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [key, toReadonlyJsonValue(entry)]),
	) as ReadonlyJSONObject;
};

const updateToolPart = (toolParts: ToolCallMessagePart[], event: PiEvent): ToolCallMessagePart[] => {
	if (!event.toolCallId || !event.toolName) {
		return toolParts;
	}

	const index = toolParts.findIndex((part) => part.toolCallId === event.toolCallId);

	if (index === -1) {
		if (event.type === "tool_execution_end") {
			return toolParts;
		}

		return [
			...toolParts,
			{
				type: "tool-call",
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				args: toReadonlyJsonObject(event.args),
				argsText: event.args ? JSON.stringify(event.args, null, 2) : "",
				result: event.type === "tool_execution_start" ? undefined : toReadonlyJsonValue(event.result),
				isError: event.isError ?? false,
			},
		];
	}

	const current = toolParts[index];
	const nextPart: ToolCallMessagePart = {
		...current,
		toolName: event.toolName,
		args: event.type === "tool_execution_start" ? toReadonlyJsonObject(event.args) : current.args,
		argsText:
			event.type === "tool_execution_start" && event.args ? JSON.stringify(event.args, null, 2) : current.argsText,
		result: event.type === "tool_execution_end" ? toReadonlyJsonValue(event.result) : current.result,
		isError: event.type === "tool_execution_end" ? (event.isError ?? false) : current.isError,
	};

	return toolParts.map((part, partIndex) => (partIndex === index ? nextPart : part));
};

export const createPiAdapter = (): ChatModelAdapter => ({
	async *run({ messages, abortSignal }: ChatModelRunOptions): AsyncGenerator<ChatModelRunResult, void> {
		const payload = messages
			.filter((message) => message.role === "user" || message.role === "assistant")
			.map((message) => ({
				role: message.role,
				content: message.content.map((part) => (part.type === "text" ? part.text : "")).join(""),
			}));

		const response = await fetch("/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ messages: payload }),
			signal: abortSignal,
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(text || `HTTP ${response.status}`);
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error("响应体不可读");
		}

		const decoder = new TextDecoder();
		let buffer = "";
		let textBuffer = "";
		let toolParts: ToolCallMessagePart[] = [];

		const buildContent = (): ThreadAssistantMessagePart[] => [{ type: "text", text: textBuffer }, ...toolParts];

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			buffer += decoder.decode(value, { stream: true });
			const chunks = buffer.split("\n\n");
			buffer = chunks.pop() ?? "";

			for (const chunk of chunks) {
				const line = chunk.split("\n").find((entry) => entry.startsWith("data: "));

				if (!line) {
					continue;
				}

				const event = JSON.parse(line.slice(6)) as PiEvent;

				if (event.type === "text_delta") {
					textBuffer += event.delta ?? "";
					yield { content: buildContent() };
					continue;
				}

				if (
					event.type === "tool_call" ||
					event.type === "tool_execution_start" ||
					event.type === "tool_execution_end"
				) {
					toolParts = updateToolPart(toolParts, event);
					yield { content: buildContent() };
					continue;
				}

				if (event.type === "error") {
					throw new Error(event.message ?? "请求失败");
				}

				if (event.type === "done") {
					return;
				}
			}
		}
	},
});
