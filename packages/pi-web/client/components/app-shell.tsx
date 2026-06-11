import { useCallback } from "react";
import { ChatPanel } from "./chat/chat-panel";
import { SessionList } from "./chat/session-list";

interface AppShellProps {
	onSessionChange: () => Promise<void>;
}

export function AppShell({ onSessionChange }: AppShellProps) {
	const handleSessionSwitch = useCallback(() => onSessionChange(), [onSessionChange]);
	const handleNewSession = useCallback(() => onSessionChange(), [onSessionChange]);

	return (
		<main className="grid h-dvh min-h-dvh grid-cols-1 bg-base mesh-bg text-foreground lg:grid-cols-[260px_minmax(0,1fr)]">
			{/* Left: Session list */}
			<div className="hidden min-h-0 border-r border-[var(--border-subtle)] lg:block">
				<SessionList onSessionSwitch={handleSessionSwitch} onNewSession={handleNewSession} />
			</div>

			{/* Right: Chat area */}
			<section className="min-w-0 min-h-0 overflow-hidden">
				<ChatPanel />
			</section>
		</main>
	);
}
