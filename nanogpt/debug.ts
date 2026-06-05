import { fetchModels } from "./api";
import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

async function getApiKey(): Promise<string | undefined> {
  let apiKey = process.env.NANOGPT_API_KEY;
  if (apiKey) {
    console.log("[debug] API Key trovata in process.env.NANOGPT_API_KEY");
    return apiKey;
  }

  try {
    const authPath = join(homedir(), ".pi", "agent", "auth.json");
    const auth = JSON.parse(readFileSync(authPath, "utf-8"));
    const providerId = "nanogpt";

    if (auth?.[providerId]?.access) {
      console.log("[debug] API Key trovata in auth.json (campo access)");
      return auth[providerId].access;
    }
    if (auth?.[providerId]?.type === "api_key") {
      console.log("[debug] API Key trovata in auth.json (campo key)");
      return auth[providerId].key;
    }
  } catch (e: any) {
    console.log("[debug] auth.json non trovato o illeggibile:", e.message);
  }

  return undefined;
}

async function main() {
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.error(
      "[debug] ERRORE: nessuna API Key trovata."
    );
    console.error("Imposta la variabile d'ambiente NANOGPT_API_KEY");
    console.error("Oppure inserisci la chiave in ~/.pi/agent/auth.json");
    process.exit(1);
  }

  console.log("[debug] Lunghezza API Key:", apiKey.length);
  console.log("[debug] Chiamata https://nano-gpt.com/api/v1/models ...");

  try {
    const models = await fetchModels(apiKey);
    console.log("[debug] SUCCESSO! Modelli ricevuti:", models.length);
    // console.log(JSON.stringify(models, null, 2));
  } catch (e: any) {
    console.error("[debug] ERRORE durante fetchModels:", e.message);
    if (e.cause) console.error("[debug] Cause:", e.cause);
    console.error(e.stack);
    process.exit(1);
  }
}

main();
