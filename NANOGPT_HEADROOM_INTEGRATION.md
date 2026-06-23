# Integrazione NanoGPT con Headroom Proxy

## Contesto

Headroom è un proxy intermedio che ottimizza le chiamate LLM (compressione contesto, caching, ecc.). Quando si lancia:

```bash
headroom wrap pi --openai-api-url https://nano-gpt.com/api/v1
```

Headroom:
1. Avvia un proxy locale sulla porta 8787
2. Inietta in `~/.pi/agent/models.json` i provider `openai`, `anthropic` e **qualsiasi provider custom con `api: "openai-completions"`** con `baseUrl` puntato al proxy
3. Esporta `OPENAI_BASE_URL=http://127.0.0.1:8787/v1` per le estensioni

Il problema è che l'estensione NanoGPT attuale ha `baseUrl` hardcodato a `https://nano-gpt.com/api/v1`, quindi bypassa completamente il proxy.

## Obiettivo

Modificare l'estensione NanoGPT in modo che:
1. Rilevi e usi `OPENAI_BASE_URL` quando è impostata (modalità Headroom)
2. Funzioni normalmente con qualsiasi altro proxy o senza proxy

Headroom è già stato reso **generico**: non è più vincolato a NanoGPT, ma supporta **qualsiasi provider custom con API OpenAI-compatible**. Manca solo la modifica lato estensione.

---

## Modifica richiesta

### File da modificare

L'estensione NanoGPT (il file che contiene `pi.registerProvider(...)`).

### Principio

Invece di hardcodare l'URL, leggere `OPENAI_BASE_URL` dall'environment. Questo è lo standard che usano tutti gli SDK OpenAI, Anthropic, Codex, etc.

**Prima:**
```typescript
baseUrl: "https://nano-gpt.com/api/v1",
```

**Dopo:**
```typescript
baseUrl: process.env.OPENAI_BASE_URL || "https://nano-gpt.com/api/v1",
```

Questo rende l'estensione:
- **Compatibile con Headroom** (che esporta `OPENAI_BASE_URL`)
- **Compatibile con qualsiasi altro proxy** (LiteLLM, localAI, etc.)
- **Funzionante senza proxy** (fallback all'URL originale)

---

## Codice completo modificato

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { fetchModels, fallbackModels } from "./api";

export default async function (pi: ExtensionAPI) {
  const providerId = "nanogpt";

  async function registerWithModels(apiKey?: string) {
    // Rispetta OPENAI_BASE_URL per compatibilità con proxy (Headroom, LiteLLM, etc.)
    const baseUrl = process.env.OPENAI_BASE_URL || "https://nano-gpt.com/api/v1";

    let models = fallbackModels;
    if (apiKey) {
      try {
        models = await fetchModels(apiKey, baseUrl);
        console.log(`[nanogpt] loaded ${models.length} models`);
      } catch (e) {
        console.error("[nanogpt] fetch models failed, using fallback:", e);
      }
    }

    pi.registerProvider(providerId, {
      name: "NanoGPT",
      baseUrl,
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

export async function fetchModels(apiKey: string, baseUrl: string = "https://nano-gpt.com/api/v1") {
  const res = await fetch(`${baseUrl}/models?detailed=true`, {
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
```

---

## Test della modifica

### 1. Senza proxy (comportamento normale)
```bash
# Non impostare OPENAI_BASE_URL
pi
# Le chiamate vanno direttamente a https://nano-gpt.com/api/v1
```

### 2. Con Headroom
```bash
headroom wrap pi --openai-api-url https://nano-gpt.com/api/v1
# Headroom imposta OPENAI_BASE_URL=http://127.0.0.1:8787/v1
# Le chiamate passano dal proxy Headroom
```

Verifica che il proxy riceva traffico:
```bash
tail -f ~/.headroom/logs/proxy.log
```

### 3. Con qualsiasi altro proxy
```bash
export OPENAI_BASE_URL=http://mio-proxy:8080/v1
pi
# Funziona con qualsiasi proxy compatibile OpenAI
```

---

## Note tecniche

### Perché `OPENAI_BASE_URL` e non `NANOGPT_BASE_URL`?
`OPENAI_BASE_URL` è lo **standard de-facto** usato da:
- OpenAI SDK (`OPENAI_BASE_URL`)
- Anthropic SDK (`ANTHROPIC_BASE_URL`)
- LangChain, LiteLLM, e molti altri

Usare lo standard rende l'estensione compatibile con **qualsiasi tool** che esporta questa variabile, non solo Headroom.

### Cosa fa Headroom (generico)
1. Avvia proxy su `http://127.0.0.1:8787`
2. Esporta `OPENAI_BASE_URL=http://127.0.0.1:8787/v1`
3. Inietta in `models.json` **tutti** i provider custom con `api: "openai-completions"`:
```json
{
  "providers": {
    "nanogpt": {
      "baseUrl": "http://127.0.0.1:8787/v1",
      "api": "openai-completions"
    },
    "groq": {
      "baseUrl": "http://127.0.0.1:8787/v1",
      "api": "openai-completions"
    }
  }
}
```
Questo funziona per **qualsiasi provider**, non solo NanoGPT.

---

## Modifiche già fatte in Headroom

Queste modifiche sono già state applicate nella repo Headroom e non richiedono azione:

- `headroom/providers/pi/runtime.py` — esporta `OPENAI_BASE_URL` (standard)
- `headroom/cli/wrap.py` — rileva e inietta **tutti** i provider custom con `api: "openai-completions"`
- `headroom/cli/wrap.py` — `unwrap` ripristina correttamente tutti i provider custom
- `tests/test_cli/test_wrap_pi.py` — test di regressione
