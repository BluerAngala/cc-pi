export interface SearchResult {
	title: string;
	url: string;
	snippet: string;
	cite?: string;
}

export interface SearchProvider {
	search(query: string, signal: AbortSignal): Promise<SearchResult[]>;
}
