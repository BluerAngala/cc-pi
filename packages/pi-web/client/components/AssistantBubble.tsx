import { useCallback, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CopyBtn({ text }: { text: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
    if (btnRef.current) {
      btnRef.current.textContent = "已复制";
      setTimeout(() => { btnRef.current!.textContent = "复制"; }, 1000);
    }
  }, [text]);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleCopy}
      className="copy-btn rounded px-1.5 py-0.5 text-[10px] opacity-0 transition-opacity duration-[var(--duration-fast)]"
      style={{ color: "var(--color-muted-dim)" }}
    >
      复制
    </button>
  );
}

export function AssistantBubble({ text }: { text: string }) {
  return (
    <div className="group flex gap-3 animate-slide-up">
      <div
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "var(--glass-accent)" }}
      >
        <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ color: "var(--color-accent)" }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-xs"
          style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
        >
          {text ? (
            <div className="pi-markdown text-sm leading-relaxed" style={{ color: "var(--color-foreground)" }}>
              <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
            </div>
          ) : (
            <div className="flex items-center gap-1 py-0.5">
              <span className="typing-dots">
                <span /><span /><span />
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-0.5 pr-1">
          {text && <CopyBtn text={text} />}
        </div>
      </div>
    </div>
  );
}
