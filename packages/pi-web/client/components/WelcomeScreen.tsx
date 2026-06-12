import { useTools } from "../hooks/useTools";

export function WelcomeScreen({ onSend }: { onSend: (text: string) => void }) {
  const { tools } = useTools();

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg text-center animate-fade-in">
        <div
          className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--glass-accent)" }}
        >
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: "var(--color-accent)" }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-foreground)" }}>
          有什么我可以帮你的？
        </h1>

        {tools.length > 0 && (
          <div className="mt-6 flex flex-col gap-2 text-left">
            {tools.map((tool) => (
              <div
                key={tool.name}
                className="rounded-xl border p-3 transition-all duration-[var(--duration-normal)]"
                style={{
                  background: "var(--glass-bg)",
                  borderColor: "var(--glass-border)",
                }}
              >
                <div className="flex items-center gap-2">
                  <code className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>
                    {tool.name}
                  </code>
                  <span className="text-[10px]" style={{ color: "var(--color-muted-dim)" }}>
                    {tool.label}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-foreground-dim)" }}>
                  {tool.description}
                </p>
                <button
                  type="button"
                  onClick={() => onSend(tool.example)}
                  className="mt-1.5 rounded-md px-2 py-0.5 text-[10px] transition-colors duration-[var(--duration-fast)]"
                  style={{
                    background: "var(--bg-muted)",
                    color: "var(--color-muted)",
                  }}
                >
                  试试：{tool.example}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
