import { describe, expect, it } from "vitest";
import {
	formatElapsed,
	formatMessageForCopy,
	formatMessagesForCopy,
	linkifyCitations,
	type Message,
	type Source,
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

	it("includes sources in copy output", () => {
		const sources: Source[] = [
			{ title: "A", url: "https://a.com" },
			{ title: "B", url: "https://b.com", cite: "B cite" },
		];
		const out = formatMessageForCopy({
			role: "assistant",
			content: "fact [1] and [2]",
			elapsedMs: 1000,
			sources,
		});
		expect(out).toContain("来源:");
		expect(out).toContain("1. A");
		expect(out).toContain("https://a.com");
		expect(out).toContain("2. B");
		expect(out).toContain("(B cite)");
	});
});

describe("linkifyCitations", () => {
	const sources: Source[] = [
		{ title: "First", url: "https://a.com/x" },
		{ title: "Second", url: "https://b.com/y" },
	];

	it("replaces [N] with markdown links", () => {
		expect(linkifyCitations("see [1] and [2]", sources)).toBe(
			"see [1](https://a.com/x) and [2](https://b.com/y)",
		);
	});

	it("leaves [N] alone when no sources", () => {
		expect(linkifyCitations("see [1]", undefined)).toBe("see [1]");
	});

	it("leaves out-of-range [N] alone", () => {
		expect(linkifyCitations("see [3] and [1]", sources)).toBe(
			"see [3] and [1](https://a.com/x)",
		);
	});

	it("does not double-link existing [N](url) syntax", () => {
		expect(linkifyCitations("see [1](https://manual.com)", sources)).toBe(
			"see [1](https://manual.com)",
		);
	});

	it("handles [10] when only 3 sources", () => {
		const three: Source[] = [
			{ title: "a", url: "u1" },
			{ title: "b", url: "u2" },
			{ title: "c", url: "u3" },
		];
		expect(linkifyCitations("[2] ok [4]", three)).toBe("[2](u2) ok [4]");
	});
});
