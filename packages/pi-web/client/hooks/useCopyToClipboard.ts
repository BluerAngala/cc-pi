import { useCallback } from "react";
import type { Message } from "./useChat";

export function useCopyToClipboard(messages: Message[]) {
  return useCallback(() => {
    if (messages.length === 0) return;

    const text = messages
      .map((m) => {
        const role = m.role === "user" ? "User" : "Assistant";
        return `${role}:\n${m.content}`;
      })
      .join("\n\n---\n\n");

    navigator.clipboard.writeText(text).catch(() => {});
  }, [messages]);
}
