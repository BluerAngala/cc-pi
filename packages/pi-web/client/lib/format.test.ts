import { describe, expect, it } from "vitest";
import {
	formatElapsed,
	formatMessageForCopy,
	formatMessagesForCopy,
	type Message,
} from "./format";

describe("formatElapsed", () => {
	it("handles sub-second values", () => {
		expect(formatElapsed(0)).toBe("0ms");
		expect(formatElapsed(500)).toBe("500ms");
		expect(formatElapsed(999)).toBe("999ms");
	});

	it("handles seconds with one decimal", () => {
		expect(formatElapsed(1000)).toBe("1.0s");
		expect(formatElapsed(23456)).toBe("23.5s");
		expect(formatElapsed(59999)).toBe("60.0s");
	});

	it("handles minutes", () => {
		expect(formatElapsed(60_000)).toBe("1分0秒");
		expect(formatElapsed(83_000)).toBe("1分23秒");
		expect(formatElapsed(125_000)).toBe("2分5秒");
	});

	it("guards against bad input", () => {
		expect(formatElapsed(-1)).toBe("0ms");
		expect(formatElapsed(Number.NaN)).toBe("0ms");
		expect(formatElapsed(Number.POSITIVE_INFINITY)).toBe("0ms");
	});
});

describe("formatMessageForCopy", () => {
	it("formats user messages without metadata", () => {
		const msg: Message = { role: "user", content: "hi" };
		expect(formatMessageForCopy(msg)).toBe("User:\nhi");
	});

	it("formats assistant messages with all timing fields", () => {
		const msg: Message = {
			role: "assistant",
			content: "answer",
			elapsedMs: 5000,
			thinkingMs: 1000,
			streamingMs: 3000,
			toolCalls: [{ label: "search_web", durationMs: 1000 }],
		};
		const out = formatMessageForCopy(msg);
		expect(out).toContain("Assistant:");
		expect(out).toContain("answer");
		expect(out).toContain("思考耗时: 1.0s");
		expect(out).toContain("工具调用: search_web 1.0s");
		expect(out).toContain("回答耗时: 3.0s");
		expect(out).toContain("总耗时: 5.0s");
	});

	it("omits empty timing fields", () => {
		const msg: Message = { role: "assistant", content: "x", elapsedMs: 1000 };
		const out = formatMessageForCopy(msg);
		expect(out).not.toContain("思考耗时");
		expect(out).not.toContain("工具调用");
		expect(out).not.toContain("回答耗时");
		expect(out).toContain("总耗时: 1.0s");
	});
});

describe("formatMessagesForCopy", () => {
	it("joins messages with separator", () => {
		const msgs: Message[] = [
			{ role: "user", content: "hi" },
			{ role: "assistant", content: "hello", elapsedMs: 500 },
		];
		const out = formatMessagesForCopy(msgs);
		expect(out).toContain("User:\nhi");
		expect(out).toContain("Assistant:\nhello");
		expect(out).toContain("---");
	});

	it("returns empty string for empty list", () => {
		expect(formatMessagesForCopy([])).toBe("");
	});
});
