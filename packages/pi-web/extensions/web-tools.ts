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
      const url = `https://www.bing.com/search?q=${encodeURIComponent(params.query)}&count=10`;
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(15000),
      });
      const html = await response.text();

      const results: string[] = [];
      // Each result is in <li class="b_algo"> ... </li>
      const algoRegex = /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
      let match: RegExpExecArray | null;

      while ((match = algoRegex.exec(html)) !== null && results.length < 8) {
        const item = match[1];

        // Extract title + URL from <h2><a href="...">Title</a></h2>
        const titleMatch = item.match(
          /<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i,
        );
        // Extract snippet from <p class="b_lineclamp2">...</p>
        const snippetMatch = item.match(
          /<p[^>]*class="b_lineclamp2"[^>]*>([\s\S]*?)<\/p>/i,
        );
        // Extract display URL from <cite>...</cite>
        const citeMatch = item.match(/<cite>([^<]*)<\/cite>/i);

        if (!titleMatch) continue;

        const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
        const link = titleMatch[1];
        const snippet = snippetMatch
          ? snippetMatch[1].replace(/<[^>]+>/g, "").trim()
          : "";
        const cite = citeMatch ? citeMatch[1].trim() : link;

        if (!title || !link) continue;

        results.push(`${results.length + 1}. ${title}\n   ${cite}\n   ${snippet}`);
      }

      const text =
        results.length > 0
          ? `搜索结果（${params.query}）：\n\n${results.join("\n\n")}`
          : `未找到关于"${params.query}"的搜索结果。`;

      return {
        content: [{ type: "text", text }],
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
