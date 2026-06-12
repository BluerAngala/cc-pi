# pi-web 开发规则

本文件是根 `AGENTS.md` 的补充，仅在 `packages/pi-web/` 范围内生效。全局规则见根目录的 `AGENTS.md`。

## 架构

前端 → `/api/*` → Express → pi SDK（`@earendil-works/pi-coding-agent`）

工具通过 extension 的 `pi.registerTool()` 注册，由 `DefaultResourceLoader` 加载（`server/session.ts`）。不使用 pi 内置工具。

## 文件分布

```
extensions/
├── tool-defs.ts     ← 工具元数据（名称、说明、示例）
└── web-tools.ts     ← search_web + read_url 实现 + pi.registerTool

server/
├── index.ts         ← Express 启动 + 路由挂载
├── session.ts       ← pi session 管理 + extension 加载
├── config.ts        ← 常量（端口、环境变量）
├── sse.ts           ← SSE 批处理
└── routes/
    ├── chat.ts      ← POST /api/chat（SSE 流式输出）
    └── tools.ts     ← GET /api/tools（工具列表）

client/
├── main.tsx         ← 入口
├── App.tsx          ← 根组件
├── styles.css       ← 全局样式 + 设计 Token
├── lib/
│   └── logger.ts    ← 调试日志（debug 包 + ring buffer）
├── hooks/
│   ├── useChat.ts          ← SSE 流式对话
│   ├── useTools.ts         ← 获取工具列表
│   └── useCopyToClipboard.ts  ← 复制对话
└── components/
    ├── Chat.tsx            ← 主布局 + 状态
    ├── Composer.tsx        ← 输入框
    ├── MessageItem.tsx     ← 消息路由
    ├── UserBubble.tsx      ← 用户气泡
    ├── AssistantBubble.tsx ← AI 气泡（Markdown + 语法高亮）
    ├── DebugPanel.tsx      ← 可拖拽调试日志面板
    ├── ToolPanel.tsx       ← 工具弹窗（Header）
    └── WelcomeScreen.tsx   ← 欢迎页
```

## 加一个工具

1. `extensions/xxx.ts` 里写 `defineTool(...)` + execute 逻辑
2. 导出 `export default function (pi) { pi.registerTool(...); }`
3. `extensions/tool-defs.ts` 加上元数据
4. `server/session.ts` 的 `extensionFactories` 数组加上

## 加一个路由

1. 新建 `server/routes/xxx.ts`，导出 `Router`
2. 在 `server/index.ts` 里 `app.use("/api/xxx", router)`

## 加一个前端组件

1. `client/components/` 下新建文件，一个文件一个组件
2. 在 `Chat.tsx` 里 import 并使用
3. 样式用 `styles.css` 的 CSS 变量（`var(--color-*)`、`var(--surface-*)`、`var(--glass-*)`）

## 约定

- 用中文回复，回答友好简洁
- 不随意删功能，先问用户

### 日志

- 统一走 `client/lib/logger.ts`，不要用 `console.log` 或 `useState` 存日志
- `chatLog()` / `toolLog()` 输出到浏览器 Console（`localStorage.debug='pi:*'` 启用）
- `logEntry()` 写入 ring buffer 供 DebugPanel 消费

### SSE 事件

| 事件 | 处理 |
|------|------|
| `tool_start` | 气泡显示 "🔍 正在{label}..." |
| `tool_end` | 记录耗时 |
| `delta` | 流式追加文本（首个 delta 替换工具状态文字） |

### Markdown

`react-markdown` + `remark-gfm` + `rehype-raw`，代码块用 `react-syntax-highlighter`（oneDark）。
`.pi-markdown` 下要有 `strong`、`em`、`del`、`kbd` 的显式样式规则。

### 消息计时

`Message` 接口字段：`elapsedMs`（总耗时）、`thinkingMs`（思考）、`streamingMs`（回答）、`toolCalls`（工具明细）。
Bubble footer 实时显示 `💭 思考 Xs  🔧 工具 Xs  ✍️ 回答 Xs  ⏱️ 总用时 Xs`。

### 复制

对话级（头部）和单条（气泡内）复制都包含计时信息，格式一致。

### 超时

客户端 3 分钟超时，`AbortController` 实现。超时后气泡显示原因，已有工具耗时保留。
