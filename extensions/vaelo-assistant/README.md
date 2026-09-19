# Preri — VAELO Coding AI

A coding assistant and green/black/gray Forest theme for VAELO and compatible VS Code editors.

Open the **V** icon. Download and activate Qwen3-Coder 30B, Gemma 4 26B A4B, or Devstral Small 24B through local Ollama. These weights download separately (approximately 19/19/14 GB). Around 32 GB or more Mac unified memory is a practical target; requirements vary.

Click **+ Add Model** for public GitHub release/Hugging Face GGUF downloads, a local GGUF file, an existing Ollama model, or an API connection. Choose from 20 named providers plus a custom OpenAI-compatible endpoint. API keys use editor SecretStorage. Enter a model ID from your provider account and run Test and Save. Copilot uses signed-in editor access rather than an API key, and may be unavailable in a source fork.

API connections send prompts and attached code to the selected provider and may incur charges. Local models keep inference on your local Ollama server. Cloud text responses appear on completion; Ollama/Copilot text streams. Provider/model access is not included. Code-only repositories are not downloadable model weights; imports require public single-file GGUF weights compatible with Ollama, or an authorized file you load yourself.

Features include Stop, persistent model selection, selected-code context, native file-edit diff review, stale-file protection, GitHub project clone controls, and **VAELO: Apply Forest Theme**. Use Remove on added cards to delete connections and saved keys. Downloaded weights remain in Ollama.

Conversation stays in the current extension session. Code is included only when attached or used for a file proposal. Review before applying. This release does not provide autonomous repository execution, inline completions, or voice.

See `VAELO_START_HERE.md` in the full source distribution for Mac setup, source build commands, and limitations. Full native VAELO builds and live provider/model inference have not been verified in the development environment; automated protocol tests use mocks.
