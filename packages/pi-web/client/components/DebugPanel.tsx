import { useCallback, useEffect, useRef, useState } from "react";
import type { LogEntry } from "../hooks/useChat";

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(1);
  if (ms < 60000) return `${s}s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}分${sec}秒`;
}

const typeStyles: Record<LogEntry["type"], { bg: string; dot: string }> = {
  send:    { bg: "rgba(96,165,250,0.08)", dot: "#60a5fa" },
  thinking:{ bg: "rgba(251,191,36,0.08)", dot: "#fbbf24" },
  tool_start:{ bg: "rgba(126,242,198,0.08)", dot: "#7ef2c6" },
  tool_end:{ bg: "rgba(126,242,198,0.05)", dot: "#7ef2c6" },
  delta:   { bg: "transparent", dot: "#7a839b" },
  done:    { bg: "rgba(126,242,198,0.05)", dot: "#5bc4a0" },
  error:   { bg: "rgba(248,113,113,0.1)", dot: "#f87171" },
  timeout: { bg: "rgba(248,113,113,0.1)", dot: "#f87171" },
  abort:   { bg: "rgba(248,113,113,0.05)", dot: "#f87171" },
};

export function DebugPanel({
  logs,
  onClear,
  visible,
  onToggle,
}: {
  logs: LogEntry[];
  onClear: () => void;
  visible: boolean;
  onToggle: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 60 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, e.clientX - dragOffset.current.x),
        y: Math.max(0, e.clientY - dragOffset.current.y),
      });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging]);

  if (!visible) return null;

  return (
    <div
      className="fixed z-50 flex flex-col overflow-hidden rounded-xl shadow-xl"
      style={{
        left: position.x,
        top: position.y,
        width: 340,
        maxHeight: "calc(100dvh - 80px)",
        background: "var(--color-surface-2)",
        border: "1px solid var(--border-default)",
        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
        fontSize: 11,
        cursor: dragging ? "grabbing" : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 select-none"
        style={{
          background: "var(--color-surface-3)",
          borderBottom: "1px solid var(--border-subtle)",
          cursor: "grab",
        }}
        onMouseDown={handleMouseDown}
      >
        <span style={{ color: "var(--color-foreground)", fontWeight: 600 }}>调试日志</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded px-1.5 py-0.5 text-[10px] transition-colors"
            style={{ color: "var(--color-muted-dim)" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            清空
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="rounded px-1.5 py-0.5 text-[10px] transition-colors"
            style={{ color: "var(--color-muted-dim)" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Log list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: 400 }}
      >
        {logs.length === 0 && (
          <div className="flex items-center justify-center py-8" style={{ color: "var(--color-muted-dim)" }}>
            暂无日志，发送一条消息开始调试
          </div>
        )}
        {logs.map((entry) => {
          const style = typeStyles[entry.type];
          return (
            <div
              key={entry.id}
              className="flex gap-2 px-3 py-1.5 leading-relaxed"
              style={{ background: style.bg }}
            >
              {/* Timestamp */}
              <span
                className="shrink-0"
                style={{ color: "var(--color-muted-dim)", width: 48 }}
              >
                {formatElapsed(entry.time)}
              </span>
              {/* Dot */}
              <span
                className="mt-[5px] shrink-0 size-[6px] rounded-full"
                style={{ background: style.dot }}
              />
              {/* Content */}
              <div className="min-w-0 flex-1">
                <div style={{ color: "var(--color-foreground)" }}>{entry.label}</div>
                {entry.detail && (
                  <div
                    className="truncate"
                    style={{ color: "var(--color-muted)" }}
                    title={entry.detail}
                  >
                    {entry.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: log count info */}
      <div
        className="flex items-center justify-between px-3 py-1.5 text-[10px]"
        style={{
          borderTop: "1px solid var(--border-subtle)",
          color: "var(--color-muted-dim)",
        }}
      >
        <span>{logs.length} 条事件</span>
        <span>拖拽标题栏移动</span>
      </div>
    </div>
  );
}
