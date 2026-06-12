import { useEffect, useState } from "react";

export interface ToolInfo {
  name: string;
  label: string;
  description: string;
  example: string;
}

export function useTools() {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tools")
      .then((res) => (res.ok ? res.json() : { tools: [] }))
      .then((data) => setTools(data.tools ?? []))
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  }, []);

  return { tools, loading };
}
