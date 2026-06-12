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
├── hooks/
│   ├── useChat.ts          ← SSE 流式对话
│   ├── useTools.ts         ← 获取工具列表
│   └── useCopyToClipboard.ts  ← 复制对话
└── components/
    ├── Chat.tsx            ← 主布局 + 状态
    ├── Composer.tsx        ← 输入框
    ├── MessageItem.tsx     ← 消息路由
    ├── UserBubble.tsx      ← 用户气泡
    ├── AssistantBubble.tsx ← AI 气泡（Markdown）
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

- 用中文回复
- 回答友好简洁
- 不随意删功能，先问用户
- 对话复制格式：`User:\n内容\n\n---\n\nAssistant:\n内容`
