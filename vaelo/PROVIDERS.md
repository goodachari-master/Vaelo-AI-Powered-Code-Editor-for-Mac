# Provider setup references

The 20 provider choices are convenience presets, not a ranking or a guarantee of account/model access. Use the exact model identifier, region and endpoint from your provider's current documentation. Preri tests API connections with a small prompt before storing the key. Chat Completions and Anthropic Messages use non-streamed text requests; Ollama and editor Copilot stream text.

| Provider | Official reference |
|---|---|
| OpenAI | https://developers.openai.com/api/reference/resources/chat |
| Anthropic | https://platform.claude.com/docs/en/api/messages/create |
| Google Gemini | https://ai.google.dev/gemini-api/docs/openai |
| DeepSeek | https://api-docs.deepseek.com/api/create-chat-completion/ |
| GitHub Copilot | https://code.visualstudio.com/api/extension-guides/ai/language-model |
| xAI | https://docs.x.ai/docs/api-reference |
| Mistral | https://docs.mistral.ai/api |
| Groq | https://console.groq.com/docs/openai |
| OpenRouter | https://openrouter.ai/docs/quickstart |
| Together AI | https://docs.together.ai/docs/inference/openai-compatibility |
| Fireworks AI | https://docs.fireworks.ai/tools-sdks/openai-compatibility |
| Cerebras | https://inference-docs.cerebras.ai/resources/openai |
| Perplexity | https://docs.perplexity.ai/docs/sonar/quickstart |
| NVIDIA NIM | https://docs.api.nvidia.com/nim/reference/llm-apis |
| Hugging Face | https://huggingface.co/docs/inference-providers/index |
| Cohere | https://docs.cohere.com/docs/compatibility-api |
| Alibaba Qwen | https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope |
| Moonshot Kimi | https://platform.kimi.ai/docs/overview |
| Z.AI | https://docs.z.ai/guides/overview/quick-start |
| SambaNova | https://docs.sambanova.ai/docs/en/get-started/api-keys-urls |

Local imports: https://docs.ollama.com/import . Model repositories must provide compatible single-file GGUF weights; repository scripts are never executed.
