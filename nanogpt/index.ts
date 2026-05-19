import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

async function fetchModels(apiKey: string) {
  const res = await fetch("https://nano-gpt.com/api/v1/models", {
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
    contextWindow: m.context_window ?? 128000,
    maxTokens: m.max_tokens ?? 4096,
  }));
}

const fallbackModels = [
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

export default async function (pi: ExtensionAPI) {
  let apiKey = process.env.NANOGPT_API_KEY ?? "";
  try {
    const authPath = join(homedir(), ".pi", "agent", "auth.json");
    const auth = JSON.parse(readFileSync(authPath, "utf-8"));
    if (auth?.nanogpt?.access) apiKey = auth.nanogpt.access;
  } catch {}

  let models = fallbackModels;
  if (apiKey) {
    try {
      models = await fetchModels(apiKey);
      console.log(`[nanogpt] caricati ${models.length} modelli`);
    } catch (e) {
      console.error("[nanogpt] fetch modelli fallito, uso fallback:", e);
    }
  }

  pi.registerProvider("nanogpt", {
    name: "NanoGPT",
    baseUrl: "https://nano-gpt.com/api/v1",
    apiKey: "NANOGPT_API_KEY",
    authHeader: true,
    api: "openai-completions",
    models,
  });
}