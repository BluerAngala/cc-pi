"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import { BotIcon, MenuIcon, PanelRightOpenIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "../ui/button";
import { UserMessage, AssistantMessage } from "./message";
import { WelcomeState } from "./welcome";
import { ComposerBar } from "./composer";

export function ChatPanel() {
	return (
		<ThreadPrimitive.Root className="flex h-full min-h-0 flex-col overflow-hidden">
			{/* Top bar */}
			<header className="glass-strong flex items-center justify-between px-4 py-2.5">
				<div className="flex items-center gap-2.5">
					<Button variant="ghost" size="icon" className="size-8 rounded-lg lg:hidden">
						<MenuIcon className="size-4" />
					</Button>
					<div className="flex items-center gap-2">
						<div className="flex size-7 items-center justify-center rounded-lg glass-accent">
							<BotIcon className="size-3.5 text-accent" />
						</div>
						<div>
							<div className="text-xs font-medium text-foreground">Pi Agent</div>
							<div className="flex items-center gap-1">
								<span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
								<span className="text-[10px] text-muted-dim">Online</span>
							</div>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-dim transition-colors duration-[var(--duration-fast)] hover:text-muted">
						<RotateCcwIcon className="size-3.5" />
					</Button>
					<Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-dim transition-colors duration-[var(--duration-fast)] hover:text-muted">
						<PanelRightOpenIcon className="size-3.5" />
					</Button>
				</div>
			</header>

			{/* Messages */}
			<ThreadPrimitive.Viewport className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-6">
				<ThreadPrimitive.Empty>
					<WelcomeState />
				</ThreadPrimitive.Empty>
				<div className="mx-auto flex max-w-3xl flex-col gap-5 pb-6 stagger-children">
					<ThreadPrimitive.Messages
						components={{ UserMessage, AssistantMessage }}
					/>
				</div>
			</ThreadPrimitive.Viewport>

			{/* Composer */}
			<ComposerBar />
		</ThreadPrimitive.Root>
	);
}
