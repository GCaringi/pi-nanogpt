# pi-nanogpt

> Access 100+ AI models via [nano-gpt.com](https://nano-gpt.com) directly inside [Pi coding agent](https://pi.dev).

---

## Why NanoGPT?

NanoGPT gives you access to a wide range of models — Claude, GPT-4o, Gemini, DeepSeek, Llama, and more — all through a single API key, with both pay-as-you-go and subscription options.

This extension wires NanoGPT into Pi as a first-class provider, with **automatic model discovery** at startup so you always see the full, up-to-date list of available models.

---

## Features

- 🔑 **Simple API key auth** — login directly inside Pi, no environment variables needed
- 🤖 **Dynamic model list** — fetched live from NanoGPT
- ⚡ **OpenAI-compatible** — works seamlessly with Pi's standard completions pipeline
- 🔁 **Reasoning model support** — auto-detects R1/thinking models and flags them correctly

---

## Install

```bash
pi install git:github.com/GCaringi/pi-nanogpt
```

---

## Setup

**1. Get your API key**

Go to [nano-gpt.com/api](https://nano-gpt.com/api) and copy your API key.

**2. Login inside Pi**

```bash
pi
```

Once Pi starts, set your API key with:

```
/login nanogpt
```

Paste your API key when prompted. Pi will save it automatically — you won't need to do this again.

NanoGPT models will appear automatically in `/model` (or `Ctrl+L`).

---

## Selecting a model

Inside Pi, press `Ctrl+L` or type `/model` and search for any NanoGPT model by name:

```
/model
> deepseek         # filters DeepSeek models
> claude           # filters Claude models
> gpt              # filters GPT models
```

---

## How it works

At startup, the extension:

1. Reads your saved API key (stored by Pi after `/login nanogpt`)
2. Fetches the full model list from `https://nano-gpt.com/api/v1/models`
3. Registers all models under the `NanoGPT` provider in Pi
4. Falls back to a minimal built-in list if the fetch fails (e.g. no internet)

---

## Requirements

- [Pi coding agent](https://pi.dev) installed (`npm install -g @earendil-works/pi-coding-agent`)
- A [nano-gpt.com](https://nano-gpt.com) account with API key

---

## License

MIT