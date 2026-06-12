import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

interface ComposerProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

export function Composer({ onSend, onStop, isLoading }: ComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      setText("");
      onSend(trimmed);
    },
    [text, isLoading, onSend],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const form = (e.target as HTMLElement).closest("form");
        form?.requestSubmit();
      }
    },
    [],
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [text]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t pb-4 pt-3 px-4"
      style={{ borderColor: "var(--glass-border)", background: "var(--glass-bg-strong)" }}
    >
      <div
        className="mx-auto max-w-3xl rounded-2xl border px-3 py-2 transition-all duration-[var(--duration-normal)]"
        style={{
          borderColor: "var(--glass-border)",
          background: "var(--surface-2)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="输入你想问的问题..."
          className="w-full resize-none bg-transparent px-1 pt-2 pb-1 text-sm leading-relaxed outline-none"
          style={{ color: "var(--color-foreground)" }}
        />
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-[10px]" style={{ color: "var(--color-muted-dim)" }}>
            Enter 发送 · Shift+Enter 换行
          </span>
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-[var(--duration-fast)] active:scale-95"
              style={{ background: "var(--color-danger)", color: "white" }}
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-[var(--duration-fast)] disabled:opacity-40 active:scale-95"
              style={{ background: "var(--color-accent-muted)", color: "var(--color-accent)" }}
            >
              发送
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
