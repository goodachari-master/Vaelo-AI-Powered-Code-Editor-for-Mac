# VAELO 0.6 + Preri — local and API model edition

VAELO is the native Electron editor built from the actual VS Code source repository. Preri is its separate built-in coding assistant. The editor and assistant use a green, black and gray theme called **VAELO Forest**; the V-symbol icon is included as SVG, PNG, macOS ICNS and Windows ICO.

## What is included

- Full VS Code source snapshot, with its original editor/workbench, terminal, debugger, file explorer, Git integration and extension system.
- VAELO product identity and platform app icons.
- Preri sidebar with three model cards, Download, Activate, Refresh, Stop, streamed conversation and selected-file context.
- Proposed file edits in the native diff editor, explicit Apply Reviewed Edit, stale-file protection and normal undo/save.
- Persistent selected model, per-window conversation, local Ollama and optional API connections.
- A separately packaged Preri VSIX is supplied alongside this source archive so you can test Preri in an existing VS Code installation without compiling this large editor first.

## Three selectable engines for Preri

| Model displayed in Preri | Exact Ollama model ID | Approximate download |
|---|---|---:|
| Qwen3-Coder 30B | `qwen3-coder:30b` | 19 GB |
| Gemma 4 26B A4B | `gemma4:26b` | 19 GB |
| Devstral Small 24B | `devstral:24b` | 14 GB |

These are verified Ollama tags. Devstral uses the original Small 24B requested here, not Devstral Small 2. The model weights are downloaded separately and are governed by their model licenses. Preri is your local assistant application around those models; this release does not train a new model or transfer model copyright to you. No cloud API key is required for local models. API connections use your provider account and billing.

The three downloads together are around 52 GB before runtime/build storage. Choose one first. Model downloads are not included in the ZIP or VSIX and do not happen silently.

**Hardware:** Download size is not total runtime memory. The OS, context/KV cache and editor need additional memory. Around 32 GB or more of Mac unified memory is a practical target for these quantized models at modest context, not a guarantee; a 16 GB Mac can fail to load them or swap heavily. Active parameter counts in MoE models do not mean only those parameters need storage. Preri displays total system RAM and asks before activation below 28 GiB. On non-Mac systems, GPU VRAM must also be considered. Local inference uses an 8,192-token runtime context and caps output at 4,096 tokens; API providers use their own model defaults.

## Fastest way to test Preri

If you already have Microsoft VS Code:

1. Open Extensions, select the `…` menu, then **Install from VSIX…**.
2. Select the supplied `preri-0.6.0.vsix`.
3. Run **VAELO: Apply Forest Theme** from the command palette if you want the green/black/gray theme. Your existing theme is not forcibly replaced when it was explicitly selected.
4. Click the V icon in the Activity Bar. The panel is called **Preri**.
5. For local models, install/open the current Ollama app from https://ollama.com/download/mac . Keep it running. If you prefer a service/CLI installation, run `ollama serve` in a terminal when no Ollama service is already running.
6. Click **Refresh**. Download one of the three models. After the download reports completion, click **Activate**.
7. Alternatively click **+ Add Model → Connect API Provider** to use a cloud model without local weights.
8. Wait for the model to load, then send a message. The selected model name appears above the chat.

This VSIX route tests Preri and the theme in your existing editor; it does not rename Microsoft VS Code into VAELO. Use the native source build below for the separately named VAELO desktop app.

## Add more AI models with the + button

Click **+ Add Model** beside **Your Models**. Setup uses native editor dialogs; credentials never pass through the chat webview.

| Choice | What happens |
|---|---|
| Download From Link | Paste a public GitHub repository or Hugging Face model repository URL, select a GGUF file, approve the download, then Preri downloads and imports it into Ollama. |
| Connect API Provider | Choose a provider, confirm the base URL, enter an exact chat model ID and API key, then Test and Save. A short real API test runs before saving. |
| Load Local File | Select a downloaded `.gguf` file and import it into Ollama. |
| Use Existing Ollama Model | Select any model already listed by your local Ollama installation. |

Added models appear as cards. Click **Activate** to switch; switching resets conversation history. **Remove** deletes a custom connection and its stored API key, but keeps model files in Ollama. Remove and reconnect to change an API key or endpoint.

**20 named provider choices, plus Custom:** OpenAI, Anthropic/Claude, Google Gemini, DeepSeek, GitHub Copilot, xAI/Grok, Mistral, Groq, OpenRouter, Together AI, Fireworks AI, Cerebras, Perplexity, NVIDIA NIM, Hugging Face Inference, Cohere, Alibaba/Qwen, Moonshot/Kimi, Z.AI/GLM, and SambaNova. These are presets, not a benchmark ranking. Model IDs, subscription eligibility, billing and regional endpoints depend on your account. The base URL is editable; use the provider's documented API base, without `/chat/completions`.

**Copilot:** Select an available signed-in Copilot model instead of pasting an API key. It uses the editor's Language Model API and authorization flow. If unavailable in VAELO, the interface reports this; an arbitrary GitHub token does not create Copilot access. You can test this connection in an existing supported VS Code installation with the official Copilot integration.

**API privacy:** Keys are saved using VS Code SecretStorage, not source files or synced configuration. A connection test and each API activation can incur a small charge. Subsequent prompts, conversation and any explicitly attached editor content go to the selected provider. The destination is displayed in the model card. API responses appear on completion; Ollama and Copilot responses stream. Failed or truncated responses are reported. Only text chat models using Chat Completions, Anthropic Messages, or the Copilot editor API are supported; arbitrary agent-service APIs need an adapter. No subscription/API credits are included.

**Repository import limits:** GitHub discovery scans GGUF assets in up to 100 releases; Hugging Face scans up to 1,000 main-branch entries. Choose a public, single-file GGUF model. Code-only repositories, Git LFS pointer files, private/gated downloads, split GGUF sets and raw training checkpoints cannot be imported automatically. For gated models, obtain authorized GGUF files yourself and use Load Local File. Ollama must support the model architecture. The importer never runs repository installation scripts, never clones executable code as a model, and cleans up its temporary download. Available disk must accommodate both the temporary weights and Ollama's copy; individual downloads are capped at 200 GB. Stop cancels the current operation. Ollama may retain its own partial data.

The prebuilt extension is also included inside the source folder at `vaelo/preri-0.6.0.vsix`.

## Build the actual VAELO desktop app on Mac

The folder is `vaelo-vscode`. You need Git, Python 3, Xcode Command Line Tools, native ARM64 Node on M4, and Node 24.18.0 or a newer release on the same major version. Native builds need several GB of additional disk and substantial build memory. The source version is the 1.139.0 development snapshot, not a verified stable binary.

If you removed the earlier Node setup, use Homebrew's fnm package:

```bash
brew install fnm
eval "$(fnm env --shell zsh)"
fnm install 24.18.0
fnm use 24.18.0
```

Inside the extracted `vaelo-vscode` folder, check the environment:

```bash
node scripts/vaelo.cjs doctor
```

Install Xcode Command Line Tools only if missing (`xcode-select --install`). Run each following step only after the preceding one succeeds:

```bash
node scripts/vaelo.cjs install
```

```bash
node scripts/vaelo.cjs compile
```

```bash
node scripts/vaelo.cjs run
```

**Previous setup failures fixed:** The launcher now initializes `.git` inside an extracted source directory before upstream postinstall runs. It also supplies `VSCODE_QUALITY=insider` and a local publish counter alongside the pinned build commit, as required by the upstream Copilot build. You no longer need manual Git initialization or manual exports for these two errors. Other platform/build problems can still occur; the full native build has not been verified here.

The original upstream Copilot extension remains in the full source tree. Qwen, Gemma and Devstral run through local Ollama. Optional Copilot connections use the editor Language Model API and require available, authorized Copilot models; the source fork does not grant Microsoft service access.

For Windows/Linux native prerequisites, follow https://github.com/microsoft/vscode/wiki/How-to-Contribute . The launcher selects native build targets; builds are not portable between OS/architecture combinations.

## How model switching works

Download stores the weights in Ollama's model store. Activate verifies the chosen model was downloaded, unloads the previously selected Preri model when switching, and warms the new one. Only after successful loading does the new ID become Preri's selected model. If warmup fails, it reports the error and retains the old selection; the old model may need reloading on the next request.

A successful switch starts a fresh conversation to avoid silently sharing history between engines. Model operations and chat run one at a time per editor window. Stop cancels the current HTTP request. Ollama controls downloaded partial layers, cache retention and release of inference memory after cancellation. Other apps/windows can still load models independently; Preri does not unload unrelated models.

The active model choice is saved between app launches. It can be reloaded on the next chat request if Ollama evicts it after five minutes of inactivity. The model cards distinguish **selected**, **downloaded** and **loaded** states.

## Coding and project workflows

- **Open Folder / Recent / GitHub** use the editor's native folder/history/Git commands. GitHub takes an HTTPS repository root URL and uses your local Git authentication.
- Use the integrated terminal to install and run your project's dependencies. For ZIP projects, extract them and open the folder.
- Chat sends only the prompt and recent conversation unless you check **Include Editor Selection / File**. Selected context is capped at 16,000 characters to keep requests manageable.
- **Propose File Edit** supports saved text files up to 16,000 characters and opens a diff. Review the whole file before **Apply Reviewed Edit**. Changes remain unsaved and undoable; no command is automatically executed.
- Preri is a coding chat/edit assistant in this release, not a repository-wide autonomous agent or inline completion service.
- This edition does not include voice recording/TTS or a separate Preri mobile app. Voice is not part of this release.

## Branding and theme

The native build reads the VAELO icon from `resources/darwin/code.icns`, `resources/win32/code.ico` and `resources/linux/code.png`. Original document-type icons are retained. Editable logo assets are in `vaelo/brand/`. The Forest theme is in `extensions/vaelo-assistant/themes/forest.json`. A new unconfigured profile defaults to Forest; an existing chosen theme can be changed with **VAELO: Apply Forest Theme**.

Colors across the custom theme and Preri interface stay within green, black and gray shades. Installed third-party extensions can bring their own icons or colors.

## Packaging and sharing

```bash
node scripts/vaelo.cjs package
```

On an M4 Mac this invokes the upstream ARM64 macOS packaging task. The output is a sibling `VSCode-darwin-arm64` folder containing `VAELO.app`. Packaging, DMG creation, signing and notarization are distinct steps. This source ZIP does **not** contain a compiled VAELO installer. No working download button is claimed for a binary that has not been built.

## Validation and source identity

See `vaelo/VALIDATION.md`. The actual editor source remains unchanged under `src/`; VAELO adds product branding, platform icons, Preri and launcher support. The complete upstream repository source is retained, including tracked LFS assets and licenses; Git history and build dependencies are omitted.

Official references:
- https://ollama.com/library/qwen3-coder:30b
- https://ollama.com/library/gemma4:26b
- https://ollama.com/library/devstral:24b
- https://docs.ollama.com/api
- https://github.com/microsoft/vscode

Microsoft-only services/Marketplace access are not supplied by renaming the public repository. The exact editor/source distinction is described by Microsoft in https://code.visualstudio.com/docs/supporting/faq .
