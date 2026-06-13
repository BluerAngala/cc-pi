import { useCallback, useEffect, useRef, useState } from "react";
import { readSseStream } from "../lib/sse";
import { chatLog, logEntry, resetBuffer, setStartTime, toolLog } from "../lib/logger";
import { appendMessage, getMessages } from "../lib/db";
import type { Message, Source, ToolCall } from "../lib/format";
import { formatElapsed } from "../lib/format";

export type { Message, ToolCall };

const TOOL_LABELS: Record<string, string> = {
	search_web: "搜索互联网",
	read_url: "读取网页",
};

const TIMEOUT_MS = 3 * 60 * 1000;

interface UseChatOptions {
	conversationId: string | null;
	onTouch?: (id: string) => void | Promise<void>;
}

export function useChat({ conversationId, onTouch }: UseChatOptions) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const abortRef = useRef<AbortController | null>(null);

	const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const timeoutReachedRef = useRef(false);

	const startTimeRef = useRef(0);
	const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const toolCallsRef = useRef<ToolCall[]>([]);
	const toolStartTimeRef = useRef<Map<string, number>>(new Map());
	const firstEventTimeRef = useRef(0);
	const firstDeltaTimeRef = useRef(0);
	const pendingToolReplaceRef = useRef(false);

	const bufferRef = useRef("");
	const rafIdRef = useRef<number | null>(null);
	const orderRef = useRef(0);
	const inFlightRef = useRef<string | null>(null);

	useEffect(() => {
		if (!conversationId) {
			setMessages([]);
			orderRef.current = 0;
			inFlightRef.current = null;
			return;
		}
		// Skip the DB reload if we just sent a message to this conversation —
		// the optimistic messages are already in state, and getMessages would
		// either return empty (wiping them) or race with the in-flight persistence.
		if (inFlightRef.current === conversationId) {
			inFlightRef.current = null;
			return;
		}
		// Abort any in-flight stream when switching conversations.
		abortRef.current?.abort();
		let cancelled = false;
		getMessages(conversationId)
			.then((msgs) => {
				if (cancelled) return;
				setMessages(msgs);
				orderRef.current = msgs.length;
			})
			.catch(() => {
				if (!cancelled) {
					setMessages([]);
					orderRef.current = 0;
				}
			});
		return () => {
			cancelled = true;
		};
	}, [conversationId]);

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

	const stop = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	const reset = useCallback(() => {
		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
		if (timeoutIdRef.current !== null) {
			clearTimeout(timeoutIdRef.current);
			timeoutIdRef.current = null;
		}
		if (timerIntervalRef.current !== null) {
			clearInterval(timerIntervalRef.current);
			timerIntervalRef.current = null;
		}
		bufferRef.current = "";
		setMessages([]);
		orderRef.current = 0;
		resetBuffer();
	}, []);

	const sendMessage = useCallback(
		async (text: string, thinking = false, conversationIdOverride?: string) => {
			const id = conversationIdOverride ?? conversationId;
			if (!id) return;

			setIsLoading(true);
			pendingToolReplaceRef.current = false;
			timeoutReachedRef.current = false;
			startTimeRef.current = Date.now();
			firstEventTimeRef.current = 0;
			firstDeltaTimeRef.current = 0;
			toolCallsRef.current = [];
			toolStartTimeRef.current = new Map();
			orderRef.current = 0;
			inFlightRef.current = id;
			chatLog("用户发送消息: %s", text.slice(0, 80) + (text.length > 80 ? "..." : ""));
			logEntry("send", "用户发送消息", text.slice(0, 80) + (text.length > 80 ? "..." : ""));
			setStartTime();

			const userOrder = orderRef.current++;
			const assistantOrder = orderRef.current++;
			const userMsg: Message = { role: "user", content: text };
			const assistantMsg: Message = { role: "assistant", content: "", elapsedMs: 0 };

			setMessages((prev) => [...prev, userMsg, assistantMsg]);
			appendMessage(id, userOrder, userMsg).catch(() => {});
			if (onTouch) Promise.resolve(onTouch(id)).catch(() => {});

			timerIntervalRef.current = setInterval(() => {
				const now = Date.now();
				const elapsed = now - startTimeRef.current;
				const thinkingMs =
					firstEventTimeRef.current > 0 ? firstEventTimeRef.current - startTimeRef.current : elapsed;
				const streamingMs = firstDeltaTimeRef.current > 0 ? now - firstDeltaTimeRef.current : 0;
				setMessages((prev) => {
					const updated = [...prev];
					const last = updated[updated.length - 1];
					if (last?.role === "assistant") {
						updated[updated.length - 1] = {
							...last,
							elapsedMs: elapsed,
							thinkingMs,
							streamingMs,
							toolCalls: [...toolCallsRef.current],
						};
					}
					return updated;
				});
			}, 500);

			const controller = new AbortController();
			abortRef.current = controller;

			timeoutIdRef.current = setTimeout(() => {
				timeoutReachedRef.current = true;
				controller.abort();
			}, TIMEOUT_MS);

			let finalAssistant: Message = assistantMsg;

			try {
				const response = await fetch("/api/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ conversationId: id, message: text, thinking }),
					signal: controller.signal,
				});

				if (!response.ok) {
					const errorText = await response.text().catch(() => "Request failed");
					throw new Error(errorText || `HTTP ${response.status}`);
				}
				if (!response.body) {
					throw new Error("No response body");
				}

				await readSseStream(response.body, (event) => {
					if (event.type === "thinking") {
						if (firstEventTimeRef.current === 0) firstEventTimeRef.current = Date.now();
						const text = String(event.text ?? "").slice(0, 60);
						chatLog("模型思考: %s", text);
						logEntry("thinking", "模型思考中", text);
						return;
					}

					if (event.type === "tool_start") {
						if (firstEventTimeRef.current === 0) firstEventTimeRef.current = Date.now();
						const name = String(event.name);
						toolStartTimeRef.current.set(name, Date.now());
						const label = TOOL_LABELS[name] || name;
						const argInfo = typeof event.args === "string" ? event.args : "";
						toolLog("工具发起: %s | %s", label, argInfo);
						logEntry("tool_start", `工具发起: ${label}`, argInfo);
						pendingToolReplaceRef.current = true;
						if (rafIdRef.current !== null) {
							cancelAnimationFrame(rafIdRef.current);
							rafIdRef.current = null;
						}
						bufferRef.current = "";
						setMessages((prev) => {
							const updated = [...prev];
							const last = updated[updated.length - 1];
							if (last?.role === "assistant") {
								updated[updated.length - 1] = { ...last, content: `🔍 正在${label}...` };
							}
							return updated;
						});
						return;
					}

					if (event.type === "tool_end") {
						const name = String(event.name);
						const toolStart = toolStartTimeRef.current.get(name);
						if (toolStart) {
							const duration = Date.now() - toolStart;
							const label = TOOL_LABELS[name] || name;
							toolCallsRef.current.push({ label, durationMs: duration });
							toolStartTimeRef.current.delete(name);
							const resultInfo = typeof event.result === "string" ? event.result : "";
							toolLog(
								"工具完成: %s (%s)%s | %s",
								label,
								formatElapsed(duration),
								event.isError ? " 失败" : "",
								resultInfo.slice(0, 80),
							);
							logEntry(
								"tool_end",
								`工具完成: ${label}`,
								`${formatElapsed(duration)}${event.isError ? " (失败)" : ""}${resultInfo ? ` | ${resultInfo}` : ""}`,
							);
						}
						const incomingSources = Array.isArray(event.sources) ? (event.sources as Source[]) : null;
						if (incomingSources && incomingSources.length > 0) {
							setMessages((prev) => {
								const updated = [...prev];
								const last = updated[updated.length - 1];
								if (last?.role === "assistant") {
									const existing = last.sources ?? [];
									const seen = new Set(existing.map((s) => s.url));
									const merged = [...existing];
									for (const s of incomingSources) {
										if (s.url && !seen.has(s.url)) {
											merged.push(s);
											seen.add(s.url);
										}
									}
									updated[updated.length - 1] = { ...last, sources: merged };
								}
								return updated;
							});
						}
						return;
					}

					if (event.type === "delta") {
						const text = String(event.text ?? "");
						if (!text) return;
						if (firstEventTimeRef.current === 0) firstEventTimeRef.current = Date.now();
						if (firstDeltaTimeRef.current === 0) firstDeltaTimeRef.current = Date.now();
						if (pendingToolReplaceRef.current) {
							pendingToolReplaceRef.current = false;
							setMessages((prev) => {
								const updated = [...prev];
								const last = updated[updated.length - 1];
								if (last?.role === "assistant") {
									updated[updated.length - 1] = { ...last, content: text };
								}
								return updated;
							});
						} else {
							bufferRef.current += text;
							scheduleFlush();
						}
					}
				}, controller.signal);

				const now = Date.now();
				const elapsed = now - startTimeRef.current;
				chatLog("回答完成, 总用时 %s", formatElapsed(elapsed));
				logEntry("done", "回答完成", `总用时 ${formatElapsed(elapsed)}`);

				const streamingMs = firstDeltaTimeRef.current > 0 ? now - firstDeltaTimeRef.current : 0;
				const thinkingMs = firstEventTimeRef.current > 0 ? firstEventTimeRef.current - startTimeRef.current : 0;

				setMessages((prev) => {
					const updated = [...prev];
					const last = updated[updated.length - 1];
					if (last?.role === "assistant") {
						finalAssistant = {
							...last,
							elapsedMs: elapsed,
							toolCalls: [...toolCallsRef.current],
							thinkingMs,
							streamingMs,
						};
						updated[updated.length - 1] = finalAssistant;
					}
					return updated;
				});
			} catch (error) {
				const elapsed = Date.now() - startTimeRef.current;
				if (error instanceof DOMException && error.name === "AbortError") {
					if (timeoutReachedRef.current) {
						chatLog("超时! 已用时 %s", formatElapsed(elapsed));
						logEntry("timeout", "回答超时（3分钟）", `已用时 ${formatElapsed(elapsed)}`);
						flushBuffer();
						const now = Date.now();
						setMessages((prev) => {
							const updated = [...prev];
							const last = updated[updated.length - 1];
							if (last?.role === "assistant") {
								finalAssistant = {
									...last,
									content: "⏱️ 回答超时（超过3分钟），请重试或换一种更简洁的提问方式。",
									elapsedMs: elapsed,
									toolCalls: [...toolCallsRef.current],
									thinkingMs: firstEventTimeRef.current > 0 ? firstEventTimeRef.current - startTimeRef.current : elapsed,
									streamingMs: firstDeltaTimeRef.current > 0 ? now - firstDeltaTimeRef.current : 0,
								};
								updated[updated.length - 1] = finalAssistant;
							}
							return updated;
						});
					} else {
						chatLog("用户中止, 已用时 %s", formatElapsed(elapsed));
						logEntry("abort", "用户中止", `已用时 ${formatElapsed(elapsed)}`);
						flushBuffer();
						const now = Date.now();
						setMessages((prev) => {
							const updated = [...prev];
							const last = updated[updated.length - 1];
							if (last?.role === "assistant") {
								finalAssistant = {
									...last,
									elapsedMs: elapsed,
									toolCalls: [...toolCallsRef.current],
									thinkingMs: firstEventTimeRef.current > 0 ? firstEventTimeRef.current - startTimeRef.current : elapsed,
									streamingMs: firstDeltaTimeRef.current > 0 ? now - firstDeltaTimeRef.current : 0,
								};
								updated[updated.length - 1] = finalAssistant;
							}
							return updated;
						});
					}
				} else {
					flushBuffer();
					const errMsg = String(error);
					chatLog("请求失败: %s", errMsg);
					logEntry("error", "请求失败", errMsg);
					setMessages((prev) => {
						const updated = [...prev];
						const last = updated[updated.length - 1];
						if (last?.role === "assistant" && !last.content) {
							finalAssistant = { role: "assistant", content: `请求失败: ${errMsg}` };
							updated[updated.length - 1] = finalAssistant;
						}
						return updated;
					});
				}
			} finally {
				if (timeoutIdRef.current !== null) {
					clearTimeout(timeoutIdRef.current);
					timeoutIdRef.current = null;
				}
				if (timerIntervalRef.current !== null) {
					clearInterval(timerIntervalRef.current);
					timerIntervalRef.current = null;
				}
				flushBuffer();
				setIsLoading(false);
				abortRef.current = null;
				if (finalAssistant.content || finalAssistant.elapsedMs) {
					appendMessage(id, assistantOrder, finalAssistant).catch(() => {});
				}
			}
		},
		[conversationId, onTouch, scheduleFlush, flushBuffer],
	);

	return { messages, sendMessage, stop, isLoading, reset };
}
