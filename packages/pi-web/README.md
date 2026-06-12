# `@earendil-works/pi-web`

基于 pi 引擎的 AI 助手 Web 应用。

## 架构

- **后端**: Express + `@earendil-works/pi-coding-agent` SDK
- **前端**: Vite + React（无第三方聊天框架）
- **AI 引擎**: pi 的 `createAgentSession()`，in-memory session

## 开发

```bash
cd packages/pi-web
npm install --ignore-scripts
npm run dev
```

- 前端默认在 `http://127.0.0.1:3310`
- API 后端在 `http://127.0.0.1:3311`

## 环境变量

至少配置一个模型提供方，例如：

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

可选：

- `PI_WEB_PORT`：API 端口，默认 `3311`

## 自定义 tools

在 `server/index.ts` 中通过 `defineTool()` 添加更多工具。
