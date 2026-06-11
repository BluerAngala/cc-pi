import { useState } from "react";
import { AssistantRuntimeProvider, useLocalRuntime, useAssistantRuntime } from "@assistant-ui/react";
import { Toaster } from "sonner";
import { AppShell } from "./components/app-shell";
import { createPiAdapter } from "./lib/pi-adapter";
import type { ThreadMessageLike } from "@assistant-ui/react";

async function loadHistoryMessages(): Promise<ThreadMessageLike[]> {
	try {
		const res = await fetch("/api/session/messages");
		if (!res.ok) return [];
		const data = await res.json() as { messages: Array<{ role: string; content: string }> };
		return data.messages
			.filter((m) => m.role === "user" || m.role === "assistant")
			.map((m) => ({
				role: m.role as "user" | "assistant",
				content: m.content,
			}));
	} catch {
		return [];
	}
}

function AppWithRuntime() {
	const runtime = useLocalRuntime(createPiAdapter());

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<AppShellInner />
		</AssistantRuntimeProvider>
	);
}

function AppShellInner() {
	const runtime = useAssistantRuntime();
	const [loaded, setLoaded] = useState(false);

	// Load history on first mount
	if (!loaded) {
		setLoaded(true);
		loadHistoryMessages().then((messages) => {
			if (messages.length > 0) {
				runtime.thread.reset(messages);
			}
		});
	}

	const handleSessionChange = async () => {
		const messages = await loadHistoryMessages();
		runtime.thread.reset(messages);
	};

	return (
		<>
			<AppShell onSessionChange={handleSessionChange} />
			<Toaster theme="dark" richColors position="top-center" />
		</>
	);
}

export function App() {
	return <AppWithRuntime />;
}
