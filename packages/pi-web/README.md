# `@earendil-works/pi-web`

给 `pi` 做的务实 Web 壳。

## 路线

- 前端：`Vite + React + assistant-ui + shadcn/ui 风格组件`
- 后端：本地 `Node + Express`，直接桥接 `@earendil-works/pi-coding-agent`
- 桌面化：
  - `Electron` 可直接内嵌前端并拉起本地 Node 服务
  - `Tauri` 可保留前端不变，只替换成本地 Rust 命令 / sidecar 传输层

## 开发

```bash
cd packages/pi-web
npm install --ignore-scripts
npm run dev
```

- 前端默认在 `http://127.0.0.1:3310`
- API 默认在 `http://127.0.0.1:3311`

## 环境变量

至少配置一个模型提供方，例如：

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

可选：

- `PI_WEB_CWD`：agent 工作目录，默认是仓库根目录
- `PI_WEB_AGENT_DIR`：自定义 `~/.pi/agent` 目录
- `PI_WEB_PORT`：API 端口，默认 `3311`
