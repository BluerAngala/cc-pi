/**
 * Batches text deltas from the agent and flushes at most once per ~50ms.
 * Avoids flooding the client with single-character SSE events.
 */
export function createSseBatcher(send: (data: Record<string, unknown>) => void) {
  let textBuffer = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    if (!textBuffer) return;
    send({ type: "delta", text: textBuffer });
    textBuffer = "";
  };

  const append = (delta: string) => {
    textBuffer += delta;
    if (!timer) {
      timer = setTimeout(flush, 50);
    }
  };

  const done = () => {
    if (timer !== null) clearTimeout(timer);
    flush();
  };

  return { append, done };
}
