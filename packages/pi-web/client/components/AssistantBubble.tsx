import { useCallback, useMemo, useRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import { formatElapsed, formatMessageForCopy, linkifyCitations, type Message } from "../lib/format";

function CopyBtn({ message }: { message: Message }) {
	const btnRef = useRef<HTMLButtonElement>(null);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(formatMessageForCopy(message)).catch(() => {});
		if (btnRef.current) {
			btnRef.current.textContent = "已复制";
			setTimeout(() => {
				if (btnRef.current) btnRef.current.textContent = "复制";
			}, 1000);
		}
	}, [message]);

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

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className || "");
  const code = String(children).replace(/\n$/, "");
  return (
    <div className="code-block-wrapper group relative">
      <SyntaxHighlighter
        style={oneDark}
        language={match ? match[1] : "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "var(--radius-lg)",
          padding: "1rem 1.25rem",
          fontSize: "0.75rem",
          lineHeight: "1.7",
          background: "var(--bg-inset-deep)",
        }}
      >
        {code}
      </SyntaxHighlighter>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(code).catch(() => {})}
        className="copy-btn absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] opacity-0 transition-opacity duration-[var(--duration-fast)]"
        style={{ color: "var(--color-muted-dim)", background: "var(--bg-muted)" }}
      >
        复制代码
      </button>
    </div>
  );
}

const components: Components = {
	a({ href, children, ...props }) {
		const isCitation =
			typeof children === "string" && /^\[\d+\]$/.test(children) === false && /^\d+$/.test(children);
		if (isCitation) {
			return (
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="citation-link"
					style={{
						display: "inline-block",
						verticalAlign: "super",
						fontSize: "0.7em",
						padding: "0 0.35em",
						borderRadius: "9999px",
						background: "var(--color-accent-muted)",
						color: "var(--color-accent)",
						textDecoration: "none",
						fontWeight: 500,
						lineHeight: 1.6,
						marginLeft: "0.15em",
					}}
					{...props}
				>
					{children}
				</a>
			);
		}
		return (
			<a href={href} target="_blank" rel="noopener noreferrer" {...props}>
				{children}
			</a>
		);
	},
	code({ className, children, ...props }) {
		const isBlock = className?.startsWith("language-");
		if (isBlock) {
			return <CodeBlock className={className} children={children} />;
		}
		return (
			<code
				className={className}
				style={{
					borderRadius: "var(--radius-sm)",
					background: "var(--bg-active)",
					padding: "0.1em 0.4em",
					color: "var(--color-accent-dim)",
					fontSize: "0.875em",
					fontFamily: '"SF Mono", "JetBrains Mono", "Fira Code", monospace',
				}}
				{...props}
			>
				{children}
			</code>
		);
	},
	pre({ children }) {
		return <>{children}</>;
	},
};

export function AssistantBubble({ message }: { message: Message }) {
	const { content, elapsedMs, toolCalls, thinkingMs, streamingMs, sources } = message;
	const linkedContent = useMemo(() => linkifyCitations(content, sources), [content, sources]);

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
					{content ? (
						<div className="pi-markdown text-sm leading-relaxed" style={{ color: "var(--color-foreground)" }}>
							<Markdown
								remarkPlugins={[remarkGfm]}
								rehypePlugins={[rehypeRaw]}
								components={components}
							>
								{linkedContent}
							</Markdown>
						</div>
					) : (
						<div className="flex items-center gap-1 py-0.5">
							<span className="typing-dots">
								<span /><span /><span />
							</span>
						</div>
					)}
					{sources && sources.length > 0 && (
						<div
							className="mt-3 border-t pt-2"
							style={{ borderColor: "var(--border-subtle)" }}
						>
							<div
								className="mb-1.5 text-[10px] font-medium"
								style={{ color: "var(--color-muted-dim)" }}
							>
								📎 来源 {sources.length}
							</div>
							<ol className="space-y-1.5">
								{sources.map((s, i) => (
									<li key={`${s.url}:${i}`} className="text-[11px] leading-relaxed">
										<a
											href={s.url}
											target="_blank"
											rel="noopener noreferrer"
											className="hover:underline"
											style={{ color: "var(--color-accent)" }}
										>
											{s.title || s.url}
										</a>
										{s.cite && (
											<span className="ml-1.5" style={{ color: "var(--color-muted-dim)" }}>
												· {s.cite}
											</span>
										)}
									</li>
								))}
							</ol>
						</div>
					)}
					{/* Footer: phase timings (shows immediately on send) */}
					{elapsedMs !== undefined && (
						<div
							className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2 text-[10px]"
							style={{ borderColor: "var(--border-subtle)", color: "var(--color-muted-dim)" }}
						>
							{thinkingMs !== undefined && thinkingMs > 0 && (
								<span className="inline-flex items-center gap-1">
									💭 思考
									<span style={{ color: "var(--color-muted)" }}>{formatElapsed(thinkingMs)}</span>
								</span>
							)}
							{toolCalls && toolCalls.length > 0 && (() => {
								const totalToolMs = toolCalls.reduce((s, t) => s + t.durationMs, 0);
								return (
									<span className="inline-flex items-center gap-1">
										🔧 工具 {toolCalls.length} 次
										<span style={{ color: "var(--color-muted)" }}>{formatElapsed(totalToolMs)}</span>
									</span>
								);
							})()}
							{streamingMs !== undefined && streamingMs > 0 && (
								<span className="inline-flex items-center gap-1">
									✍️ 回答
									<span style={{ color: "var(--color-muted)" }}>{formatElapsed(streamingMs)}</span>
								</span>
							)}
							<span className="inline-flex items-center gap-1 ml-auto">
								⏱️ 总用时 {formatElapsed(elapsedMs)}
							</span>
						</div>
					)}
				</div>
				<div className="flex justify-end pt-0.5 pr-1">
					{content && <CopyBtn message={message} />}
				</div>
			</div>
		</div>
	);
}
