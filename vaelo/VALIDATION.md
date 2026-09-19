# Validation — VAELO / Preri 0.6

- 33 focused Node tests pass: local inference protocol, model activation state, API routing/authentication, SecretStorage lifecycle, cancellation, GGUF discovery/import, incomplete downloads, and the two earlier source-build launcher regressions.
- Provider tests use injected HTTP mocks; no real API key, account, Copilot session, or live model inference was tested. All 20 providers are selectable presets, not 20 independently certified live integrations.
- Ollama and the large model weights are unavailable in this environment. GGUF import tests validate file magic and the subprocess contract using a mock process; native import remains unverified.
- Native Electron application compilation, installation and platform signing were not executed. This environment lacks required native build libraries. No installer is included.
- A standalone VSIX is packaged with @vscode/vsce and included in the full ZIP. It can be installed into an existing compatible VS Code editor to test Preri without building VAELO.
- Extension JavaScript passes syntax checks. Browser visual validation was blocked by Chromium download timeouts. Editor credential-vault behavior and Copilot consent need native runtime testing.
- The original upstream src/ directory is unchanged. Product identity, platform app icons, extension, theme, docs and launcher are customized.
- The complete tracked upstream source and license notices are preserved in the archive, including LFS assets. Git history, node_modules and generated native builds are omitted.
