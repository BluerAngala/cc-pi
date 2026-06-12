import { useCallback, useRef } from "react";

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

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="group flex justify-end animate-slide-in-right">
      <div className="max-w-[80%]">
        <div
          className="rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm"
          style={{ background: "var(--user-bg)", border: "1px solid var(--border-accent)" }}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--color-foreground)" }}>
            {text}
          </p>
        </div>
        <div className="flex justify-end pt-0.5 pr-1">
          <CopyBtn text={text} />
        </div>
      </div>
    </div>
  );
}
