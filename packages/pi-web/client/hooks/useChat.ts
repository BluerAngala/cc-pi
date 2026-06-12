import { useState, useCallback, useRef } from "react";

export interface ToolCall {
  label: string;
  durationMs: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  elapsedMs?: number;          // 总耗时
  toolCalls?: ToolCall[];      // 工具调用明细
  thinkingMs?: number;         // 思考耗时（从发送到首次响应）
  streamingMs?: number;        // 回答耗时（流式输出时长）
}

import { logEntry, chatLog, toolLog, setStartTime } from "../lib/logger.js";

const toolLabels: Record<string, string> = {
  search_web: "搜索互联网",
  read_url: "读取网页",
};

const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(1);
  if (ms < 60000) return `${s}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}分${sec}秒`;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Timeout
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutReachedRef = useRef(false);

  // Timing
  const startTimeRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toolCallsRef = useRef<ToolCall[]>([]);
  const toolStartTimeRef = useRef<Map<string, number>>(new Map());
  const firstEventTimeRef = useRef(0);   // when first tool_start or delta arrived
  const firstDeltaTimeRef = useRef(0);    // when first text delta arrived

  // When true, the next delta should replace the assistant content
  // (which currently shows a tool call status text) rather than append.
  const pendingToolReplaceRef = useRef(false);

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
    resetBuffer();
  }, []);

  const sendMessage = useCallback(async (text: string, thinking = false) => {
    setIsLoading(true);
    pendingToolReplaceRef.current = false;
    timeoutReachedRef.current = false;
    startTimeRef.current = Date.now();
    firstEventTimeRef.current = 0;
    firstDeltaTimeRef.current = 0;
    toolCallsRef.current = [];
    toolStartTimeRef.current = new Map();
    chatLog("用户发送消息: %s", text.slice(0, 80) + (text.length > 80 ? "..." : ""));
    logEntry("send", "用户发送消息", text.slice(0, 80) + (text.length > 80 ? "..." : ""));
    setStartTime();

    // Place user and empty assistant messages (elapsedMs: 0 triggers live timer UI)
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", elapsedMs: 0 },
    ]);

    // Start live timer — updates all timing fields every 500ms
    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const thinkingMs = firstEventTimeRef.current > 0
        ? firstEventTimeRef.current - startTimeRef.current
        : elapsed;
      const streamingMs = firstDeltaTimeRef.current > 0
        ? now - firstDeltaTimeRef.current
        : 0;
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

    // Start 3-minute timeout
    timeoutIdRef.current = setTimeout(() => {
      timeoutReachedRef.current = true;
      controller.abort();
    }, TIMEOUT_MS);

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
            if (firstEventTimeRef.current === 0) {
              firstEventTimeRef.current = Date.now();
            }
            chatLog("模型思考: %s", (event.text || "").slice(0, 60));
            logEntry("thinking", "模型思考中", (event.text || "").slice(0, 60));
            continue;
          }

          if (event.type === "tool_start") {
            if (firstEventTimeRef.current === 0) {
              firstEventTimeRef.current = Date.now();
            }
            toolStartTimeRef.current.set(event.name as string, Date.now());
            const label = toolLabels[event.name as string] || event.name as string;
            const argInfo = (event.args as string) || "";
            toolLog("工具发起: %s | %s", label, argInfo);
            logEntry("tool_start", `工具发起: ${label}`, argInfo);
            pendingToolReplaceRef.current = true;
            // Cancel any pending flush so it doesn't append to the status text
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
          }

          if (event.type === "tool_end") {
            const toolName = event.name as string;
            const toolStart = toolStartTimeRef.current.get(toolName);
            if (toolStart) {
              const duration = Date.now() - toolStart;
              const label = toolLabels[toolName] || toolName;
              toolCallsRef.current.push({ label, durationMs: duration });
              toolStartTimeRef.current.delete(toolName);
              const resultInfo = (event.result as string) || "";
              toolLog("工具完成: %s (%s)%s | %s", label, formatElapsed(duration), event.isError ? " 失败" : "", resultInfo.slice(0, 80));
              logEntry("tool_end", `工具完成: ${label}`, `${formatElapsed(duration)}${event.isError ? " (失败)" : ""}${resultInfo ? ` | ${resultInfo}` : ""}`);
            }
          }

          if (event.type === "delta" && event.text) {
            if (firstEventTimeRef.current === 0) {
              firstEventTimeRef.current = Date.now();
            }
            if (firstDeltaTimeRef.current === 0) {
              firstDeltaTimeRef.current = Date.now();
            }
            if (pendingToolReplaceRef.current) {
              // First delta: replace the tool status text directly via setMessages
              // (flushBuffer appends; we need replace here)
              pendingToolReplaceRef.current = false;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: event.text };
                }
                return updated;
              });
            } else {
              bufferRef.current += event.text;
              scheduleFlush();
            }
          }
        }
      }

      // Stream completed — set tool calls and phase timings
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      chatLog("回答完成, 总用时 %s", formatElapsed(elapsed));
      logEntry("done", "回答完成", `总用时 ${formatElapsed(elapsed)}`);

      const streamingMs = firstDeltaTimeRef.current > 0
        ? now - firstDeltaTimeRef.current
        : 0;
      const thinkingMs = firstEventTimeRef.current > 0
        ? firstEventTimeRef.current - startTimeRef.current
        : 0;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            elapsedMs: elapsed,
            toolCalls: [...toolCallsRef.current],
            thinkingMs,
            streamingMs,
          };
        }
        return updated;
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        if (timeoutReachedRef.current) {
          // 3-minute timeout
          chatLog("超时! 已用时 %s", formatElapsed(Date.now() - startTimeRef.current));
          logEntry("timeout", "回答超时（3分钟）", `已用时 ${formatElapsed(Date.now() - startTimeRef.current)}`);
          flushBuffer();
          const now = Date.now();
          const elapsed = now - startTimeRef.current;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: "⏱️ 回答超时（超过3分钟），请重试或换一种更简洁的提问方式。",
                elapsedMs: elapsed,
                toolCalls: [...toolCallsRef.current],
                thinkingMs: firstEventTimeRef.current > 0
                  ? firstEventTimeRef.current - startTimeRef.current
                  : elapsed,
                streamingMs: firstDeltaTimeRef.current > 0
                  ? now - firstDeltaTimeRef.current
                  : 0,
              };
            }
            return updated;
          });
        }
        if (!timeoutReachedRef.current) {
          chatLog("用户中止, 已用时 %s", formatElapsed(Date.now() - startTimeRef.current));
          logEntry("abort", "用户中止", `已用时 ${formatElapsed(Date.now() - startTimeRef.current)}`);
        }
        // For both timeout and user-initiated abort, skip generic error
      } else {
        flushBuffer();
        chatLog("请求失败: %s", String(error));
        logEntry("error", "请求失败", String(error));
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && !last.content) {
            updated[updated.length - 1] = { role: "assistant", content: `请求失败: ${error}` };
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
    }
  }, [scheduleFlush, flushBuffer]);

  return { messages, sendMessage, stop, isLoading, reset };
}
