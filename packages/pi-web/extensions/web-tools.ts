import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ═════════════════════════════════════════════════════════
//  Domain quality lists
// ═════════════════════════════════════════════════════════

const NEWS_WHITELIST = [
  "news.163.com", "thepaper.cn", "news.cctv.com", "cctv.com",
  "xinhuanet.com", "news.cn", "chinanews.com", "people.com.cn",
  "huanqiu.com", "globaltimes.cn", "yicai.com", "caixin.com",
  "jiemian.com", "reuters.com", "apnews.com", "bbc.com",
  "bbc.co.uk", "theguardian.com", "nytimes.com", "bloomberg.com",
  "wsj.com", "techcrunch.com", "theverge.com", "wired.com",
  "arstechnica.com",
];

const NEWS_BLACKLIST = ["offcn.com", "eol.cn", "exam8.com", "huatu.com", "zgjy.org", "htexam.com"];

const LOW_QUALITY_DOMAINS = [
  "baike.baidu.com", "zhidao.baidu.com", "wenku.baidu.com",
  "52pojie", "csdn.net", "zhuanlan.zhihu.com", "sohu.com/a/",
];

function isWhitelisted(url: string) { return NEWS_WHITELIST.some((d) => url.includes(d)); }
function isBlacklisted(url: string) { return NEWS_BLACKLIST.some((d) => url.includes(d)); }
function isLowQuality(url: string) { return LOW_QUALITY_DOMAINS.some((d) => url.includes(d)); }
function isAdResult(item: string) { return /b_ad|data-bm=|adlabel| promo-/i.test(item); }

function domainOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

// ═════════════════════════════════════════════════════════
//  read_url
// ═════════════════════════════════════════════════════════

const readUrlTool = defineTool({
  name: "read_url",
  label: "读取网页",
  description: "读取一个网页并返回纯文本内容。注意：只能传搜索结果里返回的具体链接，不要自己拼接或猜测 URL。",
  parameters: Type.Object({
    url: Type.String({ description: "要读取的网页地址" }),
  }),
  execute: async (_toolCallId, params) => {
    try {
      if (isBlacklisted(params.url)) {
        return { content: [{ type: "text", text: "域名已被标记为不可访问，建议换来源。" }], details: {}, isError: true };
      }
      const response = await fetch(params.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return { content: [{ type: "text", text: `页面返回错误 ${response.status}` }], details: {}, isError: true };
      }
      let text = await response.text();
      text = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "")
        .replace(/\n{4,}/g, "\n\n").trim();
      const chars = (text.match(/[\x21-\x7E\u4e00-\u9fff]/g) || []).length;
      if (text.length < 50 || chars < text.length * 0.3) {
        return { content: [{ type: "text", text: "页面内容无法正常读取" }], details: {}, isError: true };
      }
      return { content: [{ type: "text", text: text.slice(0, 8000) }], details: {} };
    } catch (error) {
      return { content: [{ type: "text", text: `读取失败: ${error}` }], details: {}, isError: true };
    }
  },
});

// ═════════════════════════════════════════════════════════
//  search_web — with detailed usage guide
// ═════════════════════════════════════════════════════════

const searchWebTool = defineTool({
  name: "search_web",
  label: "搜索互联网",
  description: `搜索互联网获取最新信息。

使用方法：
1. 先想清楚：搜什么关键词、去什么网站、预期得到什么结果
2. 用名词短语作关键词，不要用问句
3. 需要多个方面时每个方面搜一次，不要一个搜索想覆盖所有
4. 效果不好就换关键词或换目标网站再试
5. 新闻时事类用搜索摘要回答即可，不需要 read_url 查看原文`,
  parameters: Type.Object({
    query: Type.String({ description: "搜索关键词" }),
  }),
  execute: async (_toolCallId, params) => {
    try {
      const url = `https://www.bing.com/search?q=${encodeURIComponent(params.query)}&count=15`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(8000),
      });
      const html = await response.text();

      const results: string[] = [];
      const seenUrls = new Set<string>();
      const algoRegex = /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
      let match: RegExpExecArray | null;
      let whitelistCount = 0;

      while ((match = algoRegex.exec(html)) !== null && results.length < 10) {
        const item = match[1];
        if (isAdResult(item)) continue;

        const titleMatch = item.match(/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = item.match(/<p[^>]*class="b_lineclamp2"[^>]*>([\s\S]*?)<\/p>/i);
        const citeMatch = item.match(/<cite>([^<]*)<\/cite>/i);
        if (!titleMatch) continue;

        const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
        let link = titleMatch[1];
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        const cite = citeMatch ? citeMatch[1].trim() : link;
        if (!title || !link) continue;
        if (link.startsWith("//")) link = `https:${link}`;
        if (isBlacklisted(link) || isLowQuality(link)) continue;

        const norm = link.replace(/^https?:\/\//, "").replace(/\/+$/, "");
        if (seenUrls.has(norm)) continue;
        seenUrls.add(norm);
        if (isWhitelisted(link)) whitelistCount++;

        results.push(`${results.length + 1}. ${title}\n   ${cite}\n   ${snippet}`);
      }

      let text: string;
      if (results.length > 0) {
        text = `搜索结果（${params.query}）：\n\n${results.join("\n\n")}`;
        if (whitelistCount > 0) text += `\n\n（其中 ${whitelistCount} 条来自可信新闻源）`;
      } else {
        text = `未找到关于"${params.query}"的搜索结果。`;
      }
      return { content: [{ type: "text", text }], details: {} };
    } catch (error) {
      return { content: [{ type: "text", text: `搜索失败: ${error}` }], details: {}, isError: true };
    }
  },
});

export default function (pi: ExtensionAPI) {
  pi.registerTool(readUrlTool);
  pi.registerTool(searchWebTool);
}
