async function fetchJson(url: string, apiKey: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json() as any;
  return Array.isArray(data) ? data : (data?.data ?? []);
}

function mapModels(list: any[]) {
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

export async function fetchSubscriptionModels(apiKey: string, baseUrl: string = process.env.OPENAI_BASE_URL || "https://nano-gpt.com/api/v1") {
  if (baseUrl === "https://nano-gpt.com/api/v1") {
    const models = await fetchJson("https://nano-gpt.com/api/subscription/v1/models?detailed=true", apiKey);
    return mapModels(models);
  } else {
    // Custom proxy: usually there's no subscription models endpoint separate from main models
    return [];
  }
}

export async function fetchModels(apiKey: string, baseUrl: string = process.env.OPENAI_BASE_URL || "https://nano-gpt.com/api/v1") {
  if (baseUrl === "https://nano-gpt.com/api/v1") {
    const defaultBase = "https://nano-gpt.com";
    const [allModels, subModels] = await Promise.all([
      fetchJson(`${defaultBase}/api/v1/models?detailed=true`, apiKey),
      fetchJson(`${defaultBase}/api/subscription/v1/models?detailed=true`, apiKey),
    ]);

    const merged = [...allModels];
    const allIds = new Set(allModels.map((m: any) => m.id));
    for (const m of subModels) {
      if (!allIds.has(m.id)) {
        merged.push(m);
      }
    }

    return mapModels(merged);
  } else {
    // Custom proxy (Headroom, LiteLLM, etc.)
    const models = await fetchJson(`${baseUrl}/models?detailed=true`, apiKey);
    return mapModels(models);
  }
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
