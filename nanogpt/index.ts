import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
//import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai";
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

function readApiKey(): string {
  let apiKey = process.env.NANOGPT_API_KEY ?? "";
  try {
    const authPath = join(homedir(), ".pi", "agent", "auth.json");
    const auth = JSON.parse(readFileSync(authPath, "utf-8"));
    const entry = auth?.nanogpt;
    if (entry?.access) apiKey = entry.access; // oauth
    else if (entry?.key) apiKey = entry.key;  // api_key
  } catch {}
  return apiKey;
}

export default async function (pi: ExtensionAPI) {
  const apiKey = readApiKey();

  let models: any[] = [];
  if (apiKey) {
    try {
      models = await fetchModels(apiKey);
      console.log(`[nanogpt] caricati ${models.length} modelli`);
    } catch (e) {
      console.error("[nanogpt] fetch modelli fallito:", e);
    }
  }

  if (!apiKey) {
  pi.registerProvider("nanogpt", {
    name: "NanoGPT",
    baseUrl: "https://nano-gpt.com/api/v1",
    apiKey: "NANOGPT_API_KEY",
    authHeader: true,
    api: "openai-completions",
    models: [                              // <- sostituisci models: []
      {
        id: "nanogpt/setup-required",
        name: "⚠ Run /login nanogpt to configure",
        reasoning: false,
        input: ["text"] as ("text" | "image")[],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1,
        maxTokens: 1,
      },
    ],
  });

  pi.registerCommand("nanogpt-reload", {
    description: "Ricarica i modelli NanoGPT dopo il login",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Ricarico i modelli NanoGPT...", "info");
      await ctx.reload();
    },
  });

  return;
}
}