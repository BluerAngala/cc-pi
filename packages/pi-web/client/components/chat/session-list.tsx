"use client";

import { useCallback, useEffect, useState } from "react";
import {
	BotIcon,
	MessageSquareIcon,
	PlusIcon,
	Settings2Icon,
	Trash2Icon,
	PencilIcon,
	CheckIcon,
	XIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import {
	fetchSessions,
	switchSession,
	deleteSession,
	renameSession,
	newSession,
	type SessionInfo,
} from "../../lib/server-api";
import { toast } from "sonner";

interface SessionListProps {
	onSessionSwitch: () => void;
	onNewSession: () => void;
}

function formatRelativeTime(isoString: string): string {
	const date = new Date(isoString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHour / 24);

	if (diffSec < 60) return "just now";
	if (diffMin < 60) return `${diffMin}m ago`;
	if (diffHour < 24) return `${diffHour}h ago`;
	if (diffDay < 7) return `${diffDay}d ago`;
	return date.toLocaleDateString();
}

function SessionItem({
	session,
	isActive,
	onSwitch,
	onDelete,
	onRename,
}: {
	session: SessionInfo;
	isActive: boolean;
	onSwitch: () => void;
	onDelete: () => void;
	onRename: (name: string) => void;
}) {
	const [hovered, setHovered] = useState(false);
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState(session.name || "");

	const handleRename = () => {
		const trimmed = editValue.trim();
		if (trimmed && trimmed !== (session.name ?? "")) {
			onRename(trimmed);
		}
		setEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleRename();
		} else if (e.key === "Escape") {
			setEditing(false);
		}
	};

	return (
		<div
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			className={`group flex w-full flex-col rounded-lg border px-3 py-2.5 text-left transition-all duration-[var(--duration-fast)] ${
				isActive
					? "border-[var(--border-accent)] bg-accent/5"
					: "border-transparent hover:bg-[var(--bg-hover)] hover:border-[var(--border-subtle)]"
			}`}
		>
			{editing ? (
				<div className="flex items-center gap-1">
					<input
						type="text"
						value={editValue}
						onChange={(e) => setEditValue(e.target.value)}
						onKeyDown={handleKeyDown}
						className="min-w-0 flex-1 rounded-md border border-[var(--border-accent)] bg-surface-2 px-2 py-1 text-xs text-foreground outline-none"
						autoFocus
					/>
					<Button variant="ghost" size="icon" className="size-5 rounded-md text-accent" onClick={handleRename}>
						<CheckIcon className="size-3" />
					</Button>
					<Button variant="ghost" size="icon" className="size-5 rounded-md text-muted-dim" onClick={() => setEditing(false)}>
						<XIcon className="size-3" />
					</Button>
				</div>
			) : (
				<button
					type="button"
					onClick={onSwitch}
					className="w-full text-left"
				>
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0 flex-1">
							<div className="truncate text-xs font-medium text-foreground-dim">
								{session.name || session.firstMessage || "Untitled session"}
							</div>
							<div className="mt-0.5 truncate text-[10px] text-muted-dim">
								{session.messageCount} messages
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-1">
							<span className="text-[10px] text-muted-dim">{formatRelativeTime(session.modified)}</span>
							{hovered && (
								<div className="flex items-center gap-0.5 animate-fade-in">
									<Button
										variant="ghost"
										size="icon"
										className="size-5 rounded-md text-muted-dim hover:text-foreground"
										onClick={(e) => { e.stopPropagation(); setEditing(true); setEditValue(session.name || ""); }}
									>
										<PencilIcon className="size-2.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="size-5 rounded-md text-muted-dim hover:text-danger"
										onClick={(e) => { e.stopPropagation(); onDelete(); }}
									>
										<Trash2Icon className="size-2.5" />
									</Button>
								</div>
							)}
						</div>
					</div>
				</button>
			)}
		</div>
	);
}

export function SessionList({ onSessionSwitch, onNewSession }: SessionListProps) {
	const [sessions, setSessions] = useState<SessionInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeId, setActiveId] = useState<string | null>(null);

	const loadSessions = useCallback(async () => {
		try {
			const data = await fetchSessions();
			setSessions(data);
		} catch {
			setSessions([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadSessions();
	}, [loadSessions]);

	const handleSwitch = async (id: string) => {
		try {
			await switchSession(id);
			setActiveId(id);
			onSessionSwitch();
			toast.success("Session switched");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await deleteSession(id);
			setSessions((prev) => prev.filter((s) => s.id !== id));
			if (activeId === id) {
				setActiveId(null);
				onSessionSwitch();
			}
			toast.success("Session deleted");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleRename = async (id: string, name: string) => {
		try {
			await renameSession(id, name);
			setSessions((prev) =>
				prev.map((s) => (s.id === id ? { ...s, name } : s)),
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	const handleNew = async () => {
		try {
			await newSession();
			setActiveId(null);
			onNewSession();
			await loadSessions();
			toast.success("New session created");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		}
	};

	return (
		<aside className="flex h-full flex-col bg-surface-1">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-4">
				<div className="flex items-center gap-2.5">
					<div className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
						<BotIcon className="size-4" />
					</div>
					<div>
						<div className="text-sm font-semibold tracking-tight text-foreground">Pi Agent</div>
						<div className="text-[10px] text-muted-dim">v0.79.1</div>
					</div>
				</div>
				<Button variant="ghost" size="icon" className="size-8 rounded-lg">
					<Settings2Icon className="size-4" />
				</Button>
			</div>

			<Separator />

			{/* New chat button */}
			<div className="px-3 pt-3 pb-1">
				<Button
					variant="outline"
					className="w-full justify-start gap-2 rounded-lg border-dashed text-muted hover:text-foreground hover:border-solid"
					onClick={handleNew}
				>
					<PlusIcon className="size-3.5" />
					<span className="text-xs">New session</span>
				</Button>
			</div>

			{/* Session list */}
			<div className="flex-1 overflow-y-auto px-2 py-2">
				<div className="mb-2 px-2 text-[10px] font-medium uppercase tracking-widest text-muted-dim">
					Recent
				</div>
				{loading ? (
					<div className="space-y-2 px-1">
						{[1, 2, 3].map((i) => (
							<div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
						))}
					</div>
				) : sessions.length === 0 ? (
					<div className="px-3 py-6 text-center text-xs text-muted-dim">
						No sessions yet. Start a conversation!
					</div>
				) : (
					<div className="space-y-0.5">
						{sessions.map((session) => (
							<SessionItem
								key={session.id}
								session={session}
								isActive={session.id === activeId}
								onSwitch={() => handleSwitch(session.id)}
								onDelete={() => handleDelete(session.id)}
								onRename={(name) => handleRename(session.id, name)}
							/>
						))}
					</div>
				)}
			</div>

			<Separator />

			{/* Footer */}
			<div className="flex items-center gap-2 px-4 py-3">
				<div className="flex size-6 items-center justify-center rounded-md bg-[var(--bg-muted)]">
					<MessageSquareIcon className="size-3 text-muted" />
				</div>
				<span className="text-[10px] text-muted-dim">
					{sessions.length} session{sessions.length !== 1 ? "s" : ""}
				</span>
				<div className="ml-auto">
					<Button
						variant="ghost"
						size="icon"
						className="size-6 rounded-md text-muted-dim hover:text-muted"
						onClick={loadSessions}
						title="Refresh"
					>
						<svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
							<path d="M21 3v5h-5" />
						</svg>
					</Button>
				</div>
			</div>
		</aside>
	);
}
