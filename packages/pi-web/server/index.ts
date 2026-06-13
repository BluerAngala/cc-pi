import express from "express";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PI_WEB_PORT } from "./config.ts";
import chatRouter from "./routes/chat.ts";
import toolsRouter from "./routes/tools.ts";

const app = express();

app.use(express.json({ limit: "1mb" }));

// Routes
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/chat", chatRouter);
app.use("/api/tools", toolsRouter);

// Production: serve built frontend
const clientDistDir = resolve(process.cwd(), "dist-client");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDistDir));
  app.get(/^(?!\/api).*/, async (_req, res) => {
    try {
      const html = await readFile(resolve(clientDistDir, "index.html"), "utf8");
      res.type("html").send(html);
    } catch {
      res.status(404).send("Frontend not built. Run npm run build first.");
    }
  });
}

app.listen(PI_WEB_PORT, "127.0.0.1", () => {
  console.log(`pi-web running on http://127.0.0.1:${PI_WEB_PORT}`);
});
