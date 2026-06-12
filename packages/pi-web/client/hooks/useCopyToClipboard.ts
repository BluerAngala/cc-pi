import { useCallback } from "react";
import type { Message } from "./useChat";

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(1);
  if (ms < 60000) return `${s}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}分${sec}秒`;
}

export function useCopyToClipboard(messages: Message[]) {
  return useCallback(() => {
    if (messages.length === 0) return;

    const text = messages
      .map((m) => {
        const role = m.role === "user" ? "User" : "Assistant";
        let body = m.content;
        if (m.role === "assistant" && m.elapsedMs !== undefined) {
          const lines: string[] = [];
          if (m.thinkingMs !== undefined && m.thinkingMs > 0) {
            lines.push(`思考耗时: ${formatElapsed(m.thinkingMs)}`);
          }
          if (m.toolCalls && m.toolCalls.length > 0) {
            lines.push(`工具调用: ${m.toolCalls.map((tc) => `${tc.label} ${formatElapsed(tc.durationMs)}`).join(", ")}`);
          }
          if (m.streamingMs !== undefined && m.streamingMs > 0) {
            lines.push(`回答耗时: ${formatElapsed(m.streamingMs)}`);
          }
          lines.push(`总耗时: ${formatElapsed(m.elapsedMs)}`);
          body += `\n\n---\n${lines.join("\n")}`;
        }
        return `${role}:\n${body}`;
      })
      .join("\n\n---\n\n");

    navigator.clipboard.writeText(text).catch(() => {});
  }, [messages]);
}
