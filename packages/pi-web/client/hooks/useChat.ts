import { useState, useCallback, useRef } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Buffer assistant text to batch React updates
  const bufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);

  const flushBuffer = useCallback(() => {
    rafIdRef.current = null;
    if (!bufferRef.current) return;
    const text = bufferRef.current;
    bufferRef.current = "";
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === "assistant") {
        updated[updated.length - 1] = { ...last, content: last.content + text };
      }
      return updated;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushBuffer);
    }
  }, [flushBuffer]);

  const sendMessage = useCallback(async (text: string, thinking = false) => {
    setIsLoading(true);

    // Place user and empty assistant messages
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, thinking }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Request failed");
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let remainder = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        remainder += decoder.decode(value, { stream: true });
        const lines = remainder.split("\n");
        remainder = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));

          if (event.type === "thinking") {
            // Thinking content is sent as a separate event type
            // The assistant text buffer continues independently
            continue;
          }

          if (event.type === "delta" && event.text) {
            bufferRef.current += event.text;
            scheduleFlush();
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      flushBuffer();
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.content) {
          updated[updated.length - 1] = { role: "assistant", content: `请求失败: ${error}` };
        }
        return updated;
      });
    } finally {
      flushBuffer();
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [scheduleFlush, flushBuffer]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    bufferRef.current = "";
    setMessages([]);
  }, []);

  return { messages, sendMessage, stop, isLoading, reset };
}
