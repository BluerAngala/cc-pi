export interface ToolDef {
  name: string;
  label: string;
  description: string;
  example: string;
}

export const toolDefs: ToolDef[] = [
  {
    name: "search_web",
    label: "搜索互联网",
    description: "搜索互联网获取最新信息，适合查新闻、事实、技术资料等",
    example: "最近有什么大新闻？",
  },
  {
    name: "read_url",
    label: "读取网页",
    description: "读取一个网页的内容并返回纯文本",
    example: "帮我看看这个网页 https://pi.dev/",
  },
];
