import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import { getModel } from "@earendil-works/pi-ai";
import webToolsExtension from "../extensions/web-tools.js";
import { PI_WEB_CWD, PI_WEB_MODEL } from "./config.js";

async function createPiSession() {
  // Load only our custom extension, skip all auto-discovery
  const loader = new DefaultResourceLoader({
    cwd: PI_WEB_CWD,
    agentDir: getAgentDir(),
    noExtensions: true,
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
    extensionFactories: [webToolsExtension],
    systemPromptOverride: () =>
      [
        "你是一个 AI 助手，用中文回答。工具的描述写了使用原则，调用前先读。",
        "连续 2 次搜索返回一样的结果就直接用已有信息回答。",
        "回答格式：每条信息包含标题、摘要、原文链接，类似搜索引擎结果页。",
      ].join("\n"),
  });
  await loader.reload();

  let model = undefined;
  if (PI_WEB_MODEL) {
    const slashIdx = PI_WEB_MODEL.indexOf("/");
    if (slashIdx > 0) {
      model = getModel(
        PI_WEB_MODEL.slice(0, slashIdx) as never,
        PI_WEB_MODEL.slice(slashIdx + 1),
      );
    }
  }

  return createAgentSession({
    sessionManager: SessionManager.inMemory(PI_WEB_CWD),
    resourceLoader: loader,
    model,
    thinkingLevel: "off",
  });
}

// Pre-warm: create session eagerly at startup
const sessionPromise = createPiSession();

export async function getSession() {
  return (await sessionPromise).session;
}
