import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error("[ErrorBoundary]", error, info.componentStack);
	}

	handleReset = (): void => {
		this.setState({ error: null });
	};

	handleReload = (): void => {
		window.location.reload();
	};

	render(): ReactNode {
		if (this.state.error) {
			return (
				<div
					className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center"
					style={{ background: "var(--color-base)", color: "var(--color-foreground)" }}
				>
					<div
						className="flex size-12 items-center justify-center rounded-2xl"
						style={{ background: "var(--glass-accent)" }}
					>
						<svg
							className="size-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							style={{ color: "var(--color-danger)" }}
						>
							<circle cx="12" cy="12" r="10" />
							<path d="M12 8v4M12 16h.01" />
						</svg>
					</div>
					<div className="space-y-1">
						<div className="text-sm font-medium">出错了</div>
						<div
							className="max-w-md text-xs leading-relaxed"
							style={{ color: "var(--color-muted-dim)" }}
						>
							{this.state.error.message}
						</div>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={this.handleReset}
							className="rounded-lg px-3 py-1.5 text-xs transition-colors duration-[var(--duration-fast)]"
							style={{
								background: "var(--color-accent-muted)",
								color: "var(--color-accent)",
							}}
						>
							继续
						</button>
						<button
							type="button"
							onClick={this.handleReload}
							className="rounded-lg px-3 py-1.5 text-xs transition-colors duration-[var(--duration-fast)]"
							style={{ color: "var(--color-muted-dim)" }}
						>
							重新加载
						</button>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}
