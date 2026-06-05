import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { fetchModels, fallbackModels } from "./api";

export default async function (pi: ExtensionAPI) {
  const providerId = "nanogpt";

  async function registerWithModels(apiKey?: string) {
    let models = fallbackModels;
    if (apiKey) {
      try {
        models = await fetchModels(apiKey);
        console.log(`[nanogpt] loaded ${models.length} models`);
      } catch (e) {
        console.error("[nanogpt] fetch models failed, using fallback:", e);
      }
    }

    pi.registerProvider(providerId, {
      name: "NanoGPT",
      baseUrl: "https://nano-gpt.com/api/v1",
      apiKey: "$NANOGPT_API_KEY",
      authHeader: true,
      api: "openai-completions",
      models,
      oauth: {
        name: "NanoGPT",
        async login(callbacks) {
          const apiKey = await callbacks.onPrompt({
            message: "Enter your NanoGPT API Key:",
            placeholder: "sk-...",
          });
          if (!apiKey) throw new Error("API Key required");
          await registerWithModels(apiKey);
          return { access: apiKey, refresh: "", expires: Date.now() + 1000 * 60 * 60 * 24 * 365 };
        },
        getApiKey(creds) {
          return (creds as any).access;
        },
        async refreshToken(creds) {
          return creds;
        },
      },
    });
  }

  // Initial loading if a key already exists
  let apiKey = process.env.NANOGPT_API_KEY;
  if (!apiKey) {
    try {
      const authPath = join(homedir(), ".pi", "agent", "auth.json");
      const auth = JSON.parse(readFileSync(authPath, "utf-8"));
      if (auth?.[providerId]?.access) apiKey = auth[providerId].access;
      else if (auth?.[providerId]?.type === "api_key") apiKey = auth[providerId].key;
    } catch {}
  }

  await registerWithModels(apiKey);
}