import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "happy-dom",
		include: ["client/**/*.test.ts", "client/**/*.test.tsx", "extensions/**/*.test.ts"],
		setupFiles: ["./test/setup.ts"],
	},
});
