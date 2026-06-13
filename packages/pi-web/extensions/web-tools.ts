import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { bingSearchProvider } from "./bing-provider.ts";
import type { SearchResult } from "./search-provider.ts";

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
				return {
					content: [{ type: "text", text: "域名已被标记为不可访问，建议换来源。" }],
					details: {},
					isError: true,
				};
			}
			const response = await fetch(params.url, {
				headers: { "User-Agent": "Mozilla/5.0" },
				signal: AbortSignal.timeout(5000),
			});
			if (!response.ok) {
				return {
					content: [{ type: "text", text: `页面返回错误 ${response.status}` }],
					details: {},
					isError: true,
				};
			}
			let text = await response.text();
			text = text
				.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
				.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
				.replace(/<[^>]+>/g, "")
				.replace(/\n{4,}/g, "\n\n").trim();
			const chars = (text.match(/[\x21-\x7E\u4e00-\u9fff]/g) || []).length;
			if (text.length < 50 || chars < text.length * 0.3) {
				return {
					content: [{ type: "text", text: "页面内容无法正常读取" }],
					details: {},
					isError: true,
				};
			}
			return { content: [{ type: "text", text: text.slice(0, 8000) }], details: {} };
		} catch (error) {
			return {
				content: [{ type: "text", text: `读取失败: ${error}` }],
				details: {},
				isError: true,
			};
		}
	},
});

// ═════════════════════════════════════════════════════════
//  search_web — uses injected provider, with domain quality filters
// ═════════════════════════════════════════════════════════

function filterResults(results: SearchResult[]): { filtered: SearchResult[]; whitelistCount: number } {
	const filtered: SearchResult[] = [];
	let whitelistCount = 0;
	for (const r of results) {
		if (isBlacklisted(r.url) || isLowQuality(r.url)) continue;
		if (isWhitelisted(r.url)) whitelistCount++;
		filtered.push(r);
	}
	return { filtered, whitelistCount };
}

function formatResults(query: string, results: SearchResult[], whitelistCount: number): string {
	if (results.length === 0) return `未找到关于"${query}"的搜索结果。`;
	let text = `搜索结果（${query}）：\n\n${results
		.map((r, i) => `${i + 1}. ${r.title}\n   ${r.cite ?? r.url}\n   ${r.snippet}`)
		.join("\n\n")}`;
	if (whitelistCount > 0) text += `\n\n（其中 ${whitelistCount} 条来自可信新闻源）`;
	return text;
}

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
			const rawResults = await bingSearchProvider.search(params.query, AbortSignal.timeout(8000));
			const { filtered, whitelistCount } = filterResults(rawResults);
			return {
				content: [{ type: "text", text: formatResults(params.query, filtered, whitelistCount) }],
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

export default function (pi: ExtensionAPI) {
	pi.registerTool(readUrlTool);
	pi.registerTool(searchWebTool);
}
