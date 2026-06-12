/**
 * Batches text deltas from the agent.
 * First flush fires after 16ms (1 frame), subsequent flushes every 48ms.
 */
export function createSseBatcher(send: (data: Record<string, unknown>) => void) {
  let textBuffer = "";
  let timer: ReturnType<typeof setTimeout> | null = null;
  let first = true;

  const flush = () => {
    timer = null;
    first = false;
    if (!textBuffer) return;
    send({ type: "delta", text: textBuffer });
    textBuffer = "";
  };

  const append = (delta: string) => {
    textBuffer += delta;
    if (!timer) {
      timer = setTimeout(flush, first ? 16 : 48);
    }
  };

  const done = () => {
    if (timer !== null) clearTimeout(timer);
    flush();
  };

  return { append, done };
}
