import { useCallback, useRef, useState } from "react";
import type { Conversation } from "../lib/db";

interface SidebarProps {
	conversations: Conversation[];
	currentId: string | null;
	isLoading: boolean;
	onSelect: (id: string) => void;
	onCreate: () => void;
	onDelete: (id: string) => void;
	onRename: (id: string, title: string) => void;
	onClose: () => void;
}

function formatTime(ms: number): string {
	const now = Date.now();
	const diff = now - ms;
	if (diff < 60_000) return "刚刚";
	if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
	if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
	const d = new Date(ms);
	return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function Sidebar({
	conversations,
	currentId,
	isLoading,
	onSelect,
	onCreate,
	onDelete,
	onRename,
	onClose,
}: SidebarProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const editValueRef = useRef<HTMLInputElement>(null);

	const startEdit = useCallback((c: Conversation) => {
		setEditingId(c.id);
		queueMicrotask(() => {
			if (editValueRef.current) {
				editValueRef.current.value = c.title;
				editValueRef.current.focus();
				editValueRef.current.select();
			}
		});
	}, []);

	const commitEdit = useCallback(
		(id: string) => {
			const value = editValueRef.current?.value ?? "";
			onRename(id, value);
			setEditingId(null);
		},
		[onRename],
	);

	const cancelEdit = useCallback(() => {
		setEditingId(null);
	}, []);

	const handleDelete = useCallback(
		(e: React.MouseEvent, id: string) => {
			e.stopPropagation();
			if (confirm("删除这个对话？此操作无法撤销。")) {
				onDelete(id);
			}
		},
		[onDelete],
	);

	return (
		<aside
			className="flex h-full shrink-0 flex-col"
			style={{
				width: 240,
				background: "var(--glass-bg)",
				borderRight: "1px solid var(--glass-border)",
			}}
		>
			<div
				className="flex items-center justify-between px-3 py-2.5"
				style={{ borderBottom: "1px solid var(--glass-border)" }}
			>
				<div className="flex items-center gap-1.5">
					<div
						className="flex size-6 items-center justify-center rounded-md"
						style={{ background: "var(--glass-accent)" }}
					>
						<svg
							className="size-3"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							style={{ color: "var(--color-accent)" }}
						>
							<circle cx="12" cy="12" r="10" />
							<path d="M12 8v4M12 16h.01" />
						</svg>
					</div>
					<span
						className="text-xs font-medium"
						style={{ color: "var(--color-foreground)" }}
					>
						对话
					</span>
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={onCreate}
						className="rounded-md p-1 transition-colors duration-[var(--duration-fast)]"
						style={{ color: "var(--color-accent)" }}
						title="新对话"
					>
						<svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M12 5v14M5 12h14" />
						</svg>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md p-1 transition-colors duration-[var(--duration-fast)]"
						style={{ color: "var(--color-muted-dim)" }}
						title="收起侧边栏"
					>
						<svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M15 18l-6-6 6-6" />
						</svg>
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-2 py-2">
				{isLoading && (
					<div
						className="px-2 py-4 text-center text-[10px]"
						style={{ color: "var(--color-muted-dim)" }}
					>
						加载中...
					</div>
				)}
				{!isLoading && conversations.length === 0 && (
					<div
						className="px-2 py-4 text-center text-[10px]"
						style={{ color: "var(--color-muted-dim)" }}
					>
						还没有对话
					</div>
				)}
				<div className="flex flex-col gap-0.5">
					{conversations.map((c) => {
						const isActive = c.id === currentId;
						const isEditing = editingId === c.id;
						return (
							<div
								key={c.id}
								role="button"
								tabIndex={0}
								onClick={() => !isEditing && onSelect(c.id)}
								onKeyDown={(e) => {
									if (isEditing) return;
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onSelect(c.id);
									}
								}}
								onDoubleClick={() => startEdit(c)}
								className="group flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors duration-[var(--duration-fast)]"
								style={{
									background: isActive ? "var(--color-accent-muted)" : "transparent",
									border: isActive
										? "1px solid var(--border-accent)"
										: "1px solid transparent",
								}}
							>
								<div className="min-w-0 flex-1">
									{isEditing ? (
										<input
											ref={editValueRef}
											defaultValue={c.title}
											onClick={(e) => e.stopPropagation()}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													commitEdit(c.id);
												} else if (e.key === "Escape") {
													e.preventDefault();
													cancelEdit();
												}
											}}
											onBlur={() => commitEdit(c.id)}
											className="w-full rounded px-1 py-0.5 text-xs outline-none"
											style={{
												background: "var(--bg-active)",
												color: "var(--color-foreground)",
											}}
										/>
									) : (
										<div
											className="truncate text-xs"
											style={{
												color: isActive
													? "var(--color-foreground)"
													: "var(--color-foreground-dim)",
											}}
											title={c.title}
										>
											{c.title}
										</div>
									)}
									<div
										className="mt-0.5 text-[10px]"
										style={{ color: "var(--color-muted-dim)" }}
									>
										{formatTime(c.updatedAt)}
									</div>
								</div>
								<button
									type="button"
									onClick={(e) => handleDelete(e, c.id)}
									className="rounded p-1 opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100"
									style={{ color: "var(--color-muted-dim)" }}
									title="删除"
								>
									<svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
									</svg>
								</button>
							</div>
						);
					})}
				</div>
			</div>

			<div
				className="px-3 py-2 text-[10px]"
				style={{
					borderTop: "1px solid var(--glass-border)",
					color: "var(--color-muted-dim)",
				}}
			>
				双击重命名
			</div>
		</aside>
	);
}
