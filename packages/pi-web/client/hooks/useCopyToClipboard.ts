import { useCallback } from "react";
import { formatMessagesForCopy, type Message } from "../lib/format";

export function useCopyToClipboard(messages: Message[]) {
	return useCallback(() => {
		if (messages.length === 0) return;
		const text = formatMessagesForCopy(messages);
		navigator.clipboard.writeText(text).catch(() => {});
	}, [messages]);
}
