import { describe, expect, it, vi } from "vitest";
import { readSseStream, type SseEvent } from "./sse";

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		async start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});
}

describe("readSseStream", () => {
	it("parses well-formed events", async () => {
		const stream = makeStream([
			'data: {"type":"delta","text":"hello"}\n\n',
			'data: {"type":"done"}\n\n',
		]);
		const events: SseEvent[] = [];
		await readSseStream(stream, (e) => events.push(e));
		expect(events).toEqual([
			{ type: "delta", text: "hello" },
			{ type: "done" },
		]);
	});

	it("skips malformed JSON without breaking the stream", async () => {
		const stream = makeStream([
			'data: {"type":"a"}\n\n',
			"data: not-json\n\n",
			'data: {"type":"b"}\n\n',
		]);
		const events: SseEvent[] = [];
		await readSseStream(stream, (e) => events.push(e));
		expect(events.map((e) => e.type)).toEqual(["a", "b"]);
	});

	it("skips lines without the data: prefix", async () => {
		const stream = makeStream([
			"event: foo\n",
			'id: 1\n',
			'data: {"type":"x"}\n\n',
		]);
		const events: SseEvent[] = [];
		await readSseStream(stream, (e) => events.push(e));
		expect(events).toEqual([{ type: "x" }]);
	});

	it("reassembles events split across chunks", async () => {
		const stream = makeStream([
			'data: {"type":"del',
			'ta","text":"hi"}\n\n',
		]);
		const events: SseEvent[] = [];
		await readSseStream(stream, (e) => events.push(e));
		expect(events).toEqual([{ type: "delta", text: "hi" }]);
	});

	it("ignores events without a string type field", async () => {
		const stream = makeStream([
			"data: {}\n\n",
			'data: {"type":""}\n\n',
			'data: {"type":"ok"}\n\n',
		]);
		const events: SseEvent[] = [];
		await readSseStream(stream, (e) => events.push(e));
		expect(events.map((e) => e.type)).toEqual(["ok"]);
	});

	it("stops reading when signal is aborted", async () => {
		const controller = new AbortController();
		const stream = new ReadableStream<Uint8Array>({
			start(c) {
				c.enqueue(new TextEncoder().encode('data: {"type":"a"}\n\n'));
			},
			pull() {
				// never resolve
			},
		});
		const onEvent = vi.fn();
		const promise = readSseStream(stream, onEvent, controller.signal);
		controller.abort();
		await promise;
		expect(onEvent).toHaveBeenCalledTimes(1);
	});
});
