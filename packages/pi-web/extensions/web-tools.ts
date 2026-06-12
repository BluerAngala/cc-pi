import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ─── read_url ────────────────────────────────────────────

const readUrlTool = defineTool({
  name: "read_url",
  label: "读取网页",
  description: "读取一个网页并返回纯文本内容",
  parameters: Type.Object({
    url: Type.String({ description: "要读取的网页地址" }),
  }),
  execute: async (_toolCallId, params) => {
    try {
      const response = await fetch(params.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(15000),
      });
      const html = await response.text();
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n{4,}/g, "\n\n")
        .trim();
      return {
        content: [{ type: "text", text: text.slice(0, 8000) || "(empty page)" }],
        details: {},
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `读取失败: ${error}` }],
        details: {},
        isError: true,
      };
    }
  },
});

// ─── search_web ──────────────────────────────────────────

const searchWebTool = defineTool({
  name: "search_web",
  label: "搜索互联网",
  description: "搜索互联网获取最新信息",
  parameters: Type.Object({
    query: Type.String({ description: "搜索关键词" }),
  }),
  execute: async (_toolCallId, params) => {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(params.query)}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(15000),
      });
      const html = await response.text();

      const results: string[] = [];
      const linkRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

      let match: RegExpExecArray | null;
      const links: string[] = [];
      const titles: string[] = [];

      while ((match = linkRegex.exec(html)) !== null && links.length < 5) {
        const href = match[1].replace(/\/\/duckduckgo\.com\/l\/\?uddg=/, "");
        const decoded = decodeURIComponent(href);
        links.push(decoded.includes("http") ? decoded : match[1]);
        titles.push(match[2].replace(/<[^>]+>/g, "").trim());
      }

      const snippets: string[] = [];
      while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
        snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
      }

      for (let i = 0; i < Math.min(links.length, 5); i++) {
        results.push(
          `${i + 1}. ${titles[i] || "(无标题)"}\n   ${links[i] || ""}\n   ${snippets[i] || ""}`,
        );
      }

      return {
        content: [{
          type: "text",
          text: results.length > 0
            ? `搜索结果（${params.query}）：\n\n${results.join("\n\n")}`
            : `未找到关于"${params.query}"的搜索结果。`,
        }],
        details: {},
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `搜索失败: ${error}` }],
        details: {},
        isError: true,
      };
    }
  },
});

// ─── Extension entry ─────────────────────────────────────

export default function (pi: ExtensionAPI) {
  pi.registerTool(readUrlTool);
  pi.registerTool(searchWebTool);
}
