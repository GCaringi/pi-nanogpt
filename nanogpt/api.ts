export async function fetchModels(apiKey: string) {
  const res = await fetch("https://nano-gpt.com/api/v1/models?detailed=true", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json() as any;
  const list = Array.isArray(data) ? data : (data?.data ?? []);
  return list.map((m: any) => ({
    id: m.id,
    name: m.id,
    reasoning: m.id.includes("r1") || m.id.includes("thinking"),
    input: ["text"] as ("text" | "image")[],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: m.context_length ?? 128000,
    maxTokens: m.max_output_tokens ?? 4096,
  }));
}

export const fallbackModels = [
  {
    id: "unknown",
    name: "unknown",
    reasoning: false,
    input: ["text"] as ("text" | "image")[],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 200000,
    maxTokens: 4096,
  },
];
