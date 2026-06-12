import { useState } from "react";
import type { ToolInfo } from "../hooks/useTools";

export function ToolPanel({ tools }: { tools: ToolInfo[] }) {
  const [open, setOpen] = useState(false);

  if (tools.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors duration-[var(--duration-fast)]"
        style={{ color: open ? "var(--color-accent)" : "var(--color-muted-dim)" }}
      >
        <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        工具
        <span className="ml-0.5 text-[9px]">{tools.length}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border p-3 shadow-lg animate-slide-down"
            style={{
              background: "var(--surface-1)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="mb-2 text-xs font-medium" style={{ color: "var(--color-foreground)" }}>
              可用工具
            </div>
            <div className="flex flex-col gap-2">
              {tools.map((tool) => (
                <div
                  key={tool.name}
                  className="rounded-lg px-2.5 py-2"
                  style={{ background: "var(--bg-subtle)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>
                      {tool.name}
                    </code>
                    <span className="text-[10px]" style={{ color: "var(--color-muted-dim)" }}>
                      {tool.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: "var(--color-foreground-dim)" }}>
                    {tool.description}
                  </p>
                  <p className="mt-1 text-[10px]" style={{ color: "var(--color-muted)" }}>
                    试试说：<span className="italic">{tool.example}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
