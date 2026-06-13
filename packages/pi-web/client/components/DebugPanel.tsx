import { useCallback, useEffect, useRef, useState } from "react";
import { useLogBuffer } from "../lib/logger.js";
import type { LogEntry } from "../lib/logger.js";
import { formatElapsed } from "../lib/format.js";

export type DebugMode = "sidebar" | "floating";

const PANEL_WIDTH = 340;
const DETACH_THRESHOLD_PX = 4;

const typeStyles: Record<LogEntry["type"], { bg: string; dot: string }> = {
	send: { bg: "rgba(96,165,250,0.08)", dot: "#60a5fa" },
	thinking: { bg: "rgba(251,191,36,0.08)", dot: "#fbbf24" },
	tool_start: { bg: "rgba(126,242,198,0.08)", dot: "#7ef2c6" },
	tool_end: { bg: "rgba(126,242,198,0.05)", dot: "#7ef2c6" },
	delta: { bg: "transparent", dot: "#7a839b" },
	done: { bg: "rgba(126,242,198,0.05)", dot: "#5bc4a0" },
	error: { bg: "rgba(248,113,113,0.1)", dot: "#f87171" },
	timeout: { bg: "rgba(248,113,113,0.1)", dot: "#f87171" },
	abort: { bg: "rgba(248,113,113,0.05)", dot: "#f87171" },
};

interface DebugPanelProps {
	visible: boolean;
	mode: DebugMode;
	onClear: () => void;
	onClose: () => void;
	onModeChange: (mode: DebugMode) => void;
}

interface DragState {
	startX: number;
	startY: number;
	rect: DOMRect;
}

export function DebugPanel({ visible, mode, onClear, onClose, onModeChange }: DebugPanelProps) {
	const logs = useLogBuffer();
	const listRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState({ x: 0, y: 60 });
	const [dragging, setDragging] = useState(false);
	const dragOffset = useRef({ x: 0, y: 0 });
	const pendingDetach = useRef<DragState | null>(null);

	useEffect(() => {
		if (listRef.current) {
			listRef.current.scrollTop = listRef.current.scrollHeight;
		}
	}, [logs]);

	const handleHeaderMouseDown = useCallback(
		(e: React.MouseEvent) => {
			const target = e.target as HTMLElement;
			if (target.closest("button")) return;

			if (mode === "floating") {
				setDragging(true);
				dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
				return;
			}

			// Sidebar: arm a drag-to-detach; only commits once the mouse actually moves.
			const rect = panelRef.current?.getBoundingClientRect();
			if (!rect) return;
			pendingDetach.current = { startX: e.clientX, startY: e.clientY, rect };
		},
		[mode, position],
	);

	useEffect(() => {
		const handleMove = (e: MouseEvent) => {
			if (mode === "floating" && dragging) {
				setPosition({
					x: Math.max(0, e.clientX - dragOffset.current.x),
					y: Math.max(0, e.clientY - dragOffset.current.y),
				});
				return;
			}
			const pending = pendingDetach.current;
			if (mode === "sidebar" && pending) {
				const dx = e.clientX - pending.startX;
				const dy = e.clientY - pending.startY;
				if (Math.abs(dx) + Math.abs(dy) > DETACH_THRESHOLD_PX) {
					setPosition({ x: pending.rect.left, y: pending.rect.top });
					dragOffset.current = { x: e.clientX - pending.rect.left, y: e.clientY - pending.rect.top };
					pendingDetach.current = null;
					setDragging(true);
					onModeChange("floating");
				}
			}
		};
		const handleUp = () => {
			pendingDetach.current = null;
			setDragging(false);
		};
		window.addEventListener("mousemove", handleMove);
		window.addEventListener("mouseup", handleUp);
		return () => {
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("mouseup", handleUp);
		};
	}, [mode, dragging, onModeChange]);

	if (!visible) return null;

	const isSidebar = mode === "sidebar";
	const wrapperClass = isSidebar
		? "flex h-full min-h-0 shrink-0 flex-col"
		: "fixed z-50 flex flex-col overflow-hidden rounded-xl shadow-xl";
	const wrapperStyle: React.CSSProperties = isSidebar
		? {
				width: PANEL_WIDTH,
				background: "var(--color-surface-2)",
				borderLeft: "1px solid var(--border-default)",
				fontFamily: '"SF Mono", "JetBrains Mono", monospace',
				fontSize: 11,
			}
		: {
				left: position.x,
				top: position.y,
				width: PANEL_WIDTH,
				maxHeight: "calc(100dvh - 80px)",
				background: "var(--color-surface-2)",
				border: "1px solid var(--border-default)",
				fontFamily: '"SF Mono", "JetBrains Mono", monospace',
				fontSize: 11,
				cursor: dragging ? "grabbing" : undefined,
			};
	const headerStyle: React.CSSProperties = {
		background: "var(--color-surface-3)",
		borderBottom: "1px solid var(--border-subtle)",
		cursor: dragging ? "grabbing" : "grab",
	};
	const listMaxHeight = isSidebar ? undefined : 400;

	return (
		<div ref={panelRef} className={wrapperClass} style={wrapperStyle}>
			{/* Header */}
			<div
				className="flex items-center justify-between px-3 py-2 select-none"
				style={headerStyle}
				onMouseDown={handleHeaderMouseDown}
				title={isSidebar ? "拖动标题栏可拖出为浮窗" : "拖动标题栏移动"}
			>
				<div className="flex items-center gap-2">
					<span style={{ color: "var(--color-foreground)", fontWeight: 600 }}>调试日志</span>
					<button
						type="button"
						onClick={() => onModeChange(isSidebar ? "floating" : "sidebar")}
						className="rounded px-1.5 py-0.5 text-[10px] transition-colors"
						style={{ color: "var(--color-muted-dim)" }}
						onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
						onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
						title={isSidebar ? "切换为浮窗" : "切换为侧栏"}
					>
						{isSidebar ? "浮窗" : "侧栏"}
					</button>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							const text = logs
								.map((e) => `[${formatElapsed(e.time)}] ${e.type}: ${e.label}${e.detail ? ` - ${e.detail}` : ""}`)
								.join("\n");
							navigator.clipboard.writeText(text).catch(() => {});
						}}
						className="rounded px-1.5 py-0.5 text-[10px] transition-colors"
						style={{ color: "var(--color-muted-dim)" }}
						onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
						onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
					>
						复制
					</button>
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
						onClick={onClose}
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
				style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
			>
				{logs.length === 0 && (
					<div
						className="flex items-center justify-center py-8"
						style={{ color: "var(--color-muted-dim)" }}
					>
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
							<span
								className="shrink-0"
								style={{ color: "var(--color-muted-dim)", width: 48 }}
							>
								{formatElapsed(entry.time)}
							</span>
							<span
								className="mt-[5px] shrink-0 size-[6px] rounded-full"
								style={{ background: style.dot }}
							/>
							<div className="min-w-0 flex-1" style={{ minWidth: 0 }}>
								<div style={{ color: "var(--color-foreground)" }}>{entry.label}</div>
								{entry.detail && (
									<div
										className="truncate"
										style={{
											color: entry.type === "tool_start" ? "var(--color-accent-dim)" : "var(--color-muted)",
											fontFamily: '"SF Mono", "JetBrains Mono", monospace',
											fontSize: 10,
										}}
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

			{/* Footer */}
			<div
				className="flex items-center justify-between px-3 py-1.5 text-[10px]"
				style={{
					borderTop: "1px solid var(--border-subtle)",
					color: "var(--color-muted-dim)",
				}}
			>
				<span>{logs.length} 条事件</span>
				<span>{isSidebar ? "拖动标题栏拖出" : "拖动标题栏移动"}</span>
			</div>
		</div>
	);
}
