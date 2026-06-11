"use client";

import { ComposerPrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { ArrowUpIcon, PaperclipIcon, SquareIcon } from "lucide-react";
import { Button } from "../ui/button";

export function ComposerBar() {
	return (
		<div className="border-t border-[var(--glass-border)] glass-strong px-4 pb-4 pt-3">
			<div className="mx-auto max-w-3xl">
				<div className="rounded-2xl border border-[var(--glass-border)] bg-surface-2/80 shadow-md transition-all duration-[var(--duration-normal)] focus-within:border-[var(--border-accent)] focus-within:shadow-glow focus-within:bg-surface-2">
					<ComposerPrimitive.Input
						rows={1}
						placeholder="Ask Pi to read, write, or run anything..."
						className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-dim"
					/>
					<div className="flex items-center justify-between px-3 pb-2.5">
						<div className="flex items-center gap-1">
							<Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-dim transition-colors duration-[var(--duration-fast)] hover:text-muted">
								<PaperclipIcon className="size-3.5" />
							</Button>
							<span className="text-[10px] text-muted-dim">
								Shift+Enter for new line
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<ThreadPrimitive.If running={false}>
								<ComposerPrimitive.Send asChild>
									<Button
										size="icon"
										className="size-8 rounded-xl bg-accent/15 text-accent transition-all duration-[var(--duration-fast)] hover:bg-accent/25 active:scale-95"
									>
										<ArrowUpIcon className="size-4" />
									</Button>
								</ComposerPrimitive.Send>
							</ThreadPrimitive.If>
							<ThreadPrimitive.If running>
								<ComposerPrimitive.Cancel asChild>
									<Button
										size="icon"
										variant="secondary"
										className="size-8 rounded-xl animate-pulse-glow"
									>
										<SquareIcon className="size-3 fill-current" />
									</Button>
								</ComposerPrimitive.Cancel>
							</ThreadPrimitive.If>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
