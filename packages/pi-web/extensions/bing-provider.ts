import type { SearchProvider, SearchResult } from "./search-provider.ts";

const ALGO_REGEX = /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
const TITLE_REGEX = /<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i;
const SNIPPET_REGEX = /<p[^>]*class="b_lineclamp2"[^>]*>([\s\S]*?)<\/p>/i;
const CITE_REGEX = /<cite>([^<]*)<\/cite>/i;
const AD_REGEX = /b_ad|data-bm=|adlabel| promo-/i;

function isAd(item: string): boolean {
	return AD_REGEX.test(item);
}

function stripTags(s: string): string {
	return s.replace(/<[^>]+>/g, "").trim();
}

function normalizeUrl(link: string): string {
	let url = link;
	if (url.startsWith("//")) url = `https:${url}`;
	return url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export const bingSearchProvider: SearchProvider = {
	async search(query: string, signal: AbortSignal) {
		const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=15`;
		const response = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Accept: "text/html,application/xhtml+xml",
				"Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
			},
			signal: signal ?? AbortSignal.timeout(8000),
		});
		const html = await response.text();

		const results: SearchResult[] = [];
		const seen = new Set<string>();
		ALGO_REGEX.lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = ALGO_REGEX.exec(html)) !== null && results.length < 10) {
			const item = match[1];
			if (isAd(item)) continue;

			const titleMatch = item.match(TITLE_REGEX);
			if (!titleMatch) continue;

			const title = stripTags(titleMatch[2]);
			const link = titleMatch[1];
			if (!title || !link) continue;

			const snippetMatch = item.match(SNIPPET_REGEX);
			const citeMatch = item.match(CITE_REGEX);
			const snippet = snippetMatch ? stripTags(snippetMatch[1]) : "";
			const cite = citeMatch ? citeMatch[1].trim() : link;

			const norm = normalizeUrl(link);
			if (seen.has(norm)) continue;
			seen.add(norm);

			results.push({ title, url: link, snippet, cite });
		}

		return results;
	},
};
