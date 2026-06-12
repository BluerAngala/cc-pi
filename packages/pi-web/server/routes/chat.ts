import { Router } from "express";
import { getSession } from "../session.js";
import { createSseBatcher } from "../sse.js";

const router = Router();

router.post("/", async (req, res) => {
  const { message, thinking } = req.body as { message?: string; thinking?: boolean };

  if (!message?.trim()) {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  const session = await getSession();

  session.setThinkingLevel(thinking ? "low" : "off");

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const batcher = createSseBatcher(send);

  const unsubscribe = session.subscribe((event) => {
    if (event.type === "message_update") {
      if (event.assistantMessageEvent.type === "text_delta") {
        batcher.append(event.assistantMessageEvent.delta);
      }
      if (event.assistantMessageEvent.type === "thinking_delta") {
        send({ type: "thinking", text: event.assistantMessageEvent.delta });
      }
    }
    if (event.type === "tool_execution_start") {
      batcher.done();
      const args = event.args ? JSON.stringify(event.args).slice(0, 200) : undefined;
      send({ type: "tool_start", name: event.toolName, args });
    }
    if (event.type === "tool_execution_end") {
      // Extract readable text from tool result (nested in content[0].text)
      let resultPreview: string | undefined;
      if (event.result && typeof event.result === "object") {
        const content = (event.result as Record<string, unknown>).content;
        if (Array.isArray(content) && content.length > 0) {
          const first = content[0] as Record<string, unknown>;
          resultPreview = typeof first.text === "string" ? first.text.slice(0, 500) : undefined;
        }
      }
      if (!resultPreview && typeof event.result === "string") {
        resultPreview = event.result.slice(0, 500);
      }
      send({ type: "tool_end", name: event.toolName, error: event.isError, result: resultPreview });
    }
  });

  const cleanup = () => {
    batcher.done();
    unsubscribe();
    res.end();
  };

  req.on("close", cleanup);

  try {
    await session.prompt(message);
    batcher.done();
    send({ type: "done" });
  } catch (error) {
    batcher.done();
    send({ type: "error", message: String(error) });
  } finally {
    cleanup();
  }
});

export default router;
