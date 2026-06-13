import { Chat } from "./components/Chat";
import { ErrorBoundary } from "./components/ErrorBoundary";

export function App() {
	return (
		<ErrorBoundary>
			<Chat />
		</ErrorBoundary>
	);
}
