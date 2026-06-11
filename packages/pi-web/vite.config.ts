import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "client"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3310,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3311",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 3310,
  },
  build: {
    outDir: "dist-client",
  },
});
