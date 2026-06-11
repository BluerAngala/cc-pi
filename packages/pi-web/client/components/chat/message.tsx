"use client";

import { ActionBarPrimitive, MessagePrimitive, type TextMessagePartComponent } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { BotIcon, CopyIcon, RefreshCwIcon, UserIcon } from "lucide-react";
import { ToolCallBlock } from "./tool-call";

const UserText: TextMessagePartComponent = ({ text }) => (
	<div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{text}</div>
);

const AssistantText: TextMessagePartComponent = () => (
	<MarkdownTextPrimitive
		className="pi-markdown text-sm leading-relaxed text-foreground"
		remarkPlugins={[]}
	/>
);

function MessageActionBar() {
	return (
		<ActionBarPrimitive.Root
			hideWhenRunning
			autohide="not-last"
			className="flex items-center gap-0.5 px-1 opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100"
		>
			<ActionBarPrimitive.Copy asChild>
				<button
					type="button"
					className="flex size-6 items-center justify-center rounded-md text-muted-dim transition-colors duration-[var(--duration-fast)] hover:bg-[var(--bg-hover)] hover:text-muted data-[copied]:text-accent"
				>
					<CopyIcon className="size-3" />
				</button>
			</ActionBarPrimitive.Copy>
			<ActionBarPrimitive.Reload asChild>
				<button
					type="button"
					className="flex size-6 items-center justify-center rounded-md text-muted-dim transition-colors duration-[var(--duration-fast)] hover:bg-[var(--bg-hover)] hover:text-muted"
				>
					<RefreshCwIcon className="size-3" />
				</button>
			</ActionBarPrimitive.Reload>
		</ActionBarPrimitive.Root>
	);
}

export function UserMessage() {
	return (
		<div className="flex justify-end animate-slide-in-right">
			<div className="max-w-[80%] rounded-2xl rounded-br-sm bg-gradient-to-br from-accent/12 to-accent/4 px-4 py-3 shadow-sm" style={{ border: "1px solid var(--border-accent)" }}>
				<div className="mb-1.5 flex items-center justify-end gap-1.5">
					<span className="text-[10px] font-medium text-accent-dim">You</span>
					<div className="flex size-5 items-center justify-center rounded-md bg-accent/10">
						<UserIcon className="size-3 text-accent" />
					</div>
				</div>
				<MessagePrimitive.Parts components={{ Text: UserText }} />
			</div>
		</div>
	);
}

export function AssistantMessage() {
	return (
		<div className="group flex gap-3 animate-slide-up">
			<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl glass-accent shadow-xs">
				<BotIcon className="size-4 text-accent" />
			</div>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="text-[10px] font-medium text-muted-dim">Pi Agent</div>
				<div className="glass rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs">
					<MessagePrimitive.Parts
						components={{
							Text: AssistantText,
							tools: { Fallback: ToolCallBlock },
						}}
					/>
				</div>
				<MessageActionBar />
			</div>
		</div>
	);
}
