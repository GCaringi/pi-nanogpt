import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai";
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

  pi.registerProvider("nanogpt", {
    name: "NanoGPT",
    baseUrl: "https://nano-gpt.com/api/v1",
    apiKey: "NANOGPT_API_KEY",
    authHeader: true,
    api: "openai-completions",
    models,
    oauth: {
      name: "NanoGPT (API Key)",
      async login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
        const key = await callbacks.onPrompt({
          message: "Paste your NanoGPT API key (nano-gpt.com/api):",
        });
        return {
          access: key.trim(),
          refresh: "",
          expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
        };
      },
      async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
        return { ...credentials, expires: Date.now() + 1000 * 60 * 60 * 24 * 365 };
      },
      getApiKey(credentials: OAuthCredentials): string {
        return credentials.access;
      },
    },
  });

  pi.registerCommand("nanogpt-reload", {
    description: "Reload NanoGPT models after login",
    handler: async (_args, ctx) => {
      ctx.ui.notify("Reloading NanoGPT models...", "info");
      await ctx.reload();
    },
  });
}