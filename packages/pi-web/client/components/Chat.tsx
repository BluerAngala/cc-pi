import { useCallback, useEffect, useRef, useState } from "react";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useChat } from "../hooks/useChat";
import { useTools } from "../hooks/useTools";
import { Composer } from "./Composer";
import { MessageItem } from "./MessageItem";
import { ToolPanel } from "./ToolPanel";
import { WelcomeScreen } from "./WelcomeScreen";

export function Chat() {
  const { messages, sendMessage, stop, isLoading, reset } = useChat();
  const [thinking, setThinking] = useState(false);
  const { tools } = useTools();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const copyMessages = useCopyToClipboard(messages);
  const copyBtnRef = useRef<HTMLButtonElement>(null);
  const handleCopy = useCallback(() => {
    copyMessages();
    if (copyBtnRef.current) {
      const el = copyBtnRef.current;
      el.textContent = "已复制";
      setTimeout(() => { el.textContent = "复制"; }, 1000);
    }
  }, [copyMessages]);

  const handleSend = useCallback(
    (text: string) => sendMessage(text, thinking),
    [sendMessage, thinking],
  );

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: "var(--color-base)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "var(--glass-bg-strong)", borderBottom: "1px solid var(--glass-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-7 items-center justify-center rounded-lg"
            style={{ background: "var(--glass-accent)" }}
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: "var(--color-accent)" }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <div className="text-xs font-medium" style={{ color: "var(--color-foreground)" }}>
            AI 助手
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ToolPanel tools={tools} />
          <button
            type="button"
            ref={copyBtnRef}
            onClick={handleCopy}
            className="rounded-lg px-2 py-1 text-xs transition-colors duration-[var(--duration-fast)]"
            style={{ color: "var(--color-muted-dim)" }}
            title="复制对话（Markdown 格式）"
          >
            复制
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg px-2 py-1 text-xs transition-colors duration-[var(--duration-fast)]"
            style={{ color: "var(--color-muted-dim)" }}
          >
            清空
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-5 md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 && !isLoading && (
            <WelcomeScreen onSend={handleSend} />
          )}
          {messages.map((message, i) => (
            <MessageItem key={i} message={message} />
          ))}
        </div>
      </div>

      {/* Thinking toggle */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-1">
        <label
          className="flex cursor-pointer items-center justify-end gap-1.5 select-none pb-1"
          style={{ color: "var(--color-muted-dim)" }}
        >
          <span className="text-[10px]">深度思考</span>
          <button
            type="button"
            role="switch"
            aria-checked={thinking}
            onClick={() => setThinking(!thinking)}
            className="relative inline-flex h-4 w-7 shrink-0 rounded-full border transition-colors duration-[var(--duration-fast)]"
            style={{
              borderColor: thinking ? "var(--border-accent)" : "var(--border-subtle)",
              background: thinking ? "var(--color-accent-muted)" : "var(--bg-muted)",
            }}
          >
            <span
              className="inline-block h-3 w-3 translate-y-px rounded-full transition-transform duration-[var(--duration-fast)]"
              style={{
                transform: thinking ? "translateX(14px)" : "translateX(2px)",
                background: thinking ? "var(--color-accent)" : "var(--color-muted-dim)",
              }}
            />
          </button>
        </label>
      </div>

      <Composer onSend={handleSend} onStop={stop} isLoading={isLoading} />
    </div>
  );
}
