import { useCallback, useEffect, useRef, useState } from "react";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useChat } from "../hooks/useChat";
import { useTools } from "../hooks/useTools";
import { useConversations } from "../hooks/useConversations";
import { Composer } from "./Composer";
import { MessageItem } from "./MessageItem";
import { ToolPanel } from "./ToolPanel";
import { WelcomeScreen } from "./WelcomeScreen";
import { DebugPanel, type DebugMode } from "./DebugPanel";
import { Sidebar } from "./Sidebar";
import { resetBuffer } from "../lib/logger";

const DEBUG_MODE_KEY = "pi-web:debug-mode";

function loadDebugMode(): DebugMode {
	try {
		const stored = localStorage.getItem(DEBUG_MODE_KEY);
		return stored === "floating" ? "floating" : "sidebar";
	} catch {
		return "sidebar";
	}
}

function saveDebugMode(mode: DebugMode): void {
	try {
		localStorage.setItem(DEBUG_MODE_KEY, mode);
	} catch {
		/* noop */
	}
}

export function Chat() {
	const {
		conversations,
		currentId,
		currentConversation,
		isLoading: convsLoading,
		create,
		switchTo,
		remove,
		rename,
		touch,
	} = useConversations();
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [thinking, setThinking] = useState(false);
	const [debugVisible, setDebugVisible] = useState(false);
	const [debugMode, setDebugMode] = useState<DebugMode>(loadDebugMode);

	const { messages, sendMessage, stop, isLoading, reset } = useChat({
		conversationId: currentId,
		onTouch: touch,
	});
	const { tools } = useTools();
	const scrollRef = useRef<HTMLDivElement>(null);
	const copyMessages = useCopyToClipboard(messages);
	const copyBtnRef = useRef<HTMLButtonElement>(null);
	const titledRef = useRef<Set<string>>(new Set());

	const handleCopy = useCallback(() => {
		copyMessages();
		if (copyBtnRef.current) {
			const el = copyBtnRef.current;
			el.textContent = "已复制";
			setTimeout(() => {
				el.textContent = "复制";
			}, 1000);
		}
	}, [copyMessages]);

	const handleSend = useCallback(
		async (text: string) => {
			let id = currentId;
			if (!id) {
				const conv = await create();
				id = conv.id;
			}
			sendMessage(text, thinking, id);
		},
		[currentId, create, sendMessage, thinking],
	);

	const handleNew = useCallback(async () => {
		await create();
		reset();
	}, [create, reset]);

	const updateDebugMode = useCallback((mode: DebugMode) => {
		setDebugMode(mode);
		saveDebugMode(mode);
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages]);

	useEffect(() => {
		if (!currentId || !currentConversation) return;
		if (currentConversation.title !== "新对话") return;
		if (titledRef.current.has(currentId)) return;
		const firstUser = messages.find((m) => m.role === "user");
		if (!firstUser) return;
		const title = firstUser.content.slice(0, 30);
		titledRef.current.add(currentId);
		rename(currentId, title);
	}, [messages, currentId, currentConversation, rename]);

	const sidebarWidth = sidebarOpen ? 240 : 0;

	return (
		<div
			className="flex h-full min-h-0"
			style={{ background: "var(--color-base)" }}
		>
			{sidebarOpen && (
				<Sidebar
					conversations={conversations}
					currentId={currentId}
					isLoading={convsLoading}
					onSelect={switchTo}
					onCreate={handleNew}
					onDelete={remove}
					onRename={rename}
					onClose={() => setSidebarOpen(false)}
				/>
			)}

			<div className="flex h-full min-w-0 flex-1 flex-col">
				<header
					className="flex items-center justify-between px-4 py-2.5"
					style={{ background: "var(--glass-bg-strong)", borderBottom: "1px solid var(--glass-border)" }}
				>
					<div className="flex items-center gap-2.5">
						{!sidebarOpen && (
							<button
								type="button"
								onClick={() => setSidebarOpen(true)}
								className="rounded-lg p-1.5 transition-colors duration-[var(--duration-fast)]"
								style={{ color: "var(--color-muted-dim)" }}
								title="打开侧边栏"
							>
								<svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<path d="M3 6h18M3 12h18M3 18h18" />
								</svg>
							</button>
						)}
						<div
							className="flex size-7 items-center justify-center rounded-lg"
							style={{ background: "var(--glass-accent)" }}
						>
							<svg
								className="size-3.5"
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
						<div
							className="max-w-[40vw] truncate text-xs font-medium"
							style={{ color: "var(--color-foreground)" }}
							title={currentConversation?.title}
						>
							{currentConversation?.title ?? "AI 助手"}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<ToolPanel tools={tools} />
						<button
							type="button"
							onClick={() => setDebugVisible((v) => !v)}
							className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors duration-[var(--duration-fast)]"
							style={{
								color: debugVisible ? "var(--color-accent)" : "var(--color-muted-dim)",
								background: debugVisible ? "var(--color-accent-muted)" : undefined,
							}}
							title="调试日志"
						>
							<svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
							</svg>
							调试
						</button>
						<button
							type="button"
							ref={copyBtnRef}
							onClick={handleCopy}
							className="rounded-lg px-2 py-1 text-xs transition-colors duration-[var(--duration-fast)]"
							style={{ color: "var(--color-muted-dim)" }}
							title="复制对话（Markdown 格式）"
						>
							复制
						</button>
						<button
							type="button"
							onClick={handleNew}
							className="rounded-lg px-2 py-1 text-xs transition-colors duration-[var(--duration-fast)]"
							style={{ color: "var(--color-muted-dim)" }}
						>
							新对话
						</button>
					</div>
				</header>

				<div
					ref={scrollRef}
					className="min-h-0 flex-1 overflow-y-auto px-3 py-5 md:px-6"
				>
					<div className="mx-auto flex max-w-3xl flex-col gap-4">
						{messages.length === 0 && !isLoading && (
							<WelcomeScreen onSend={handleSend} />
						)}
						{messages.map((message, i) => (
							<MessageItem key={`${currentId ?? "none"}:${i}`} message={message} />
						))}
					</div>
				</div>

				<div className="mx-auto w-full max-w-3xl px-4 pb-1">
					<label
						className="flex cursor-pointer items-center justify-end gap-1.5 select-none pb-1"
						style={{ color: "var(--color-muted-dim)" }}
					>
						<span className="text-[10px]">深度思考</span>
						<button
							type="button"
							role="switch"
							aria-checked={thinking}
							onClick={() => setThinking(!thinking)}
							className="relative inline-flex h-4 w-7 shrink-0 rounded-full border transition-colors duration-[var(--duration-fast)]"
							style={{
								borderColor: thinking ? "var(--border-accent)" : "var(--border-subtle)",
								background: thinking ? "var(--color-accent-muted)" : "var(--bg-muted)",
							}}
						>
							<span
								className="inline-block h-3 w-3 translate-y-px rounded-full transition-transform duration-[var(--duration-fast)]"
								style={{
									transform: thinking ? "translateX(14px)" : "translateX(2px)",
									background: thinking ? "var(--color-accent)" : "var(--color-muted-dim)",
								}}
							/>
						</button>
					</label>
				</div>

				<Composer onSend={handleSend} onStop={stop} isLoading={isLoading} />
			</div>

			<DebugPanel
				visible={debugVisible}
				mode={debugMode}
				onClear={resetBuffer}
				onClose={() => setDebugVisible(false)}
				onModeChange={updateDebugMode}
			/>

			{sidebarWidth === 0 && null}
		</div>
	);
}
