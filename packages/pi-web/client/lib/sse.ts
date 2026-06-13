/**
 * Parses a Server-Sent Events stream and invokes onEvent for each complete event.
 * The stream format is `data: <json>\n\n` per event. Lines are split on `\n`.
 *
 * Bad lines (non-`data: ` prefix or JSON parse errors) are skipped silently
 * to keep the stream alive — the previous behavior crashed the whole reader.
 */
export interface SseEvent {
	type: string;
	[key: string]: unknown;
}

export async function readSseStream(
	body: ReadableStream<Uint8Array>,
	onEvent: (event: SseEvent) => void,
	signal?: AbortSignal,
): Promise<void> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let remainder = "";

	const onAbort = () => {
		try {
			reader.cancel();
		} catch {
			/* noop */
		}
	};
	if (signal) {
		if (signal.aborted) {
			onAbort();
			return;
		}
		signal.addEventListener("abort", onAbort, { once: true });
	}

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			remainder += decoder.decode(value, { stream: true });
			const lines = remainder.split("\n");
			remainder = lines.pop() ?? "";

			for (const line of lines) {
				if (!line.startsWith("data: ")) continue;
				const payload = line.slice(6);
				let event: SseEvent;
				try {
					event = JSON.parse(payload) as SseEvent;
				} catch {
					continue;
				}
				if (
					event &&
					typeof event === "object" &&
					typeof event.type === "string" &&
					event.type.length > 0
				) {
					onEvent(event);
				}
			}
		}
	} finally {
		if (signal) signal.removeEventListener("abort", onAbort);
		try {
			reader.releaseLock();
		} catch {
			/* noop */
		}
	}
}
