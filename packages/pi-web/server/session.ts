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
      "你是一个 AI 助手，用中文回答。\n\n" +
      "你有以下工具可用：\n" +
      "- read_url(url)：读取一个网页并返回纯文本内容\n" +
      "- search_web(query)：搜索互联网获取最新信息\n\n" +
      "规则：\n" +
      "1. 回答友好简洁，不要啰嗦。\n" +
      "2. 需要最新信息或你不知道的事情时，先 search_web 搜索。\n" +
      "3. 用户提供网页地址时，用 read_url 读取内容。\n" +
      "4. 不知道的事情就说不知道，不要编造。\n" +
      "5. 你只能使用上面列出的两个工具。",
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
