/* Copyright (c) Microsoft Corporation. MIT License. VAELO / Preri additions. */
'use strict';
// Provider choices, not a performance ranking. Model IDs are entered from the user's account.
const PROVIDERS = [
	['openai', 'OpenAI', 'https://api.openai.com/v1'],
	['anthropic', 'Anthropic / Claude', 'https://api.anthropic.com/v1', 'anthropic'],
	['gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta/openai'],
	['deepseek', 'DeepSeek', 'https://api.deepseek.com/v1'],
	['copilot', 'GitHub Copilot', '', 'copilot'],
	['xai', 'xAI / Grok', 'https://api.x.ai/v1'],
	['mistral', 'Mistral', 'https://api.mistral.ai/v1'],
	['groq', 'Groq', 'https://api.groq.com/openai/v1'],
	['openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1'],
	['together', 'Together AI', 'https://api.together.ai/v1'],
	['fireworks', 'Fireworks AI', 'https://api.fireworks.ai/inference/v1'],
	['cerebras', 'Cerebras', 'https://api.cerebras.ai/v1'],
	['perplexity', 'Perplexity', 'https://api.perplexity.ai'],
	['nvidia', 'NVIDIA NIM', 'https://integrate.api.nvidia.com/v1'],
	['huggingface', 'Hugging Face Inference', 'https://router.huggingface.co/v1'],
	['cohere', 'Cohere', 'https://api.cohere.ai/compatibility/v1'],
	['alibaba', 'Alibaba / Qwen', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'],
	['moonshot', 'Moonshot / Kimi', 'https://api.moonshot.ai/v1'],
	['zai', 'Z.AI / GLM', 'https://api.z.ai/api/paas/v4'],
	['sambanova', 'SambaNova', 'https://api.sambanova.ai/v1'],
	['custom', 'Custom OpenAI-Compatible API', ''],
].map(([id, name, endpoint, protocol = 'openai']) => ({ id, name, endpoint, protocol }));
function apiEndpoint(value) {
	const url = new URL(value);
	if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
		throw new Error('Use HTTPS, or HTTP on localhost. Do not put credentials or query parameters in the URL.');
	}
	return url.href.replace(/\/$/, '');
}
async function remoteChat(profile, key, messages, onText, signal, fetchImpl = fetch) {
	const endpoint = apiEndpoint(profile.endpoint);
	if (!key) { throw new Error('API key missing. Remove and reconnect this provider.'); }
	if (/[\x00-\x20\x7f]/.test(key)) { throw new Error('API key contains whitespace or control characters. Re-enter the key.'); }
	const anthropic = profile.protocol === 'anthropic';
	const headers = { 'Content-Type': 'application/json', ...(anthropic ? { 'x-api-key': key, 'anthropic-version': '2023-06-01' } : { Authorization: 'Bearer ' + key }) };
	const body = anthropic ? { model: profile.model, max_tokens: 4096, system: messages.filter(m => m.role === 'system').map(m => m.content).join('\n'), messages: messages.filter(m => m.role !== 'system'), stream: false } : { model: profile.model, messages, stream: false };
	const response = await fetchImpl(endpoint + (anthropic ? '/messages' : '/chat/completions'), {
		method: 'POST', headers, body: JSON.stringify(body), redirect: 'error',
		signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(300000)]) : AbortSignal.timeout(300000),
	});
	// Do not echo provider response bodies: some gateways reflect credentials.
	if (!response.ok) { throw new Error(`Provider HTTP ${response.status}. Check your API key, model ID, endpoint, quota and account access.`); }
	const result = await response.json();
	const choice = result.choices?.[0];
	if (anthropic ? result.stop_reason !== 'end_turn' && result.stop_reason !== 'stop_sequence' : choice?.finish_reason !== 'stop') {
		throw new Error('Provider did not return a complete text answer (possibly a token limit, refusal, or unsupported tool call).');
	}
	const text = anthropic ? (result.content || []).filter(c => c.type === 'text').map(c => c.text).join('') : choice.message?.content;
	if (typeof text !== 'string' || !text.trim() || text.length > 500000) { throw new Error('Provider returned an empty or oversized text answer.'); }
	onText(text); return text;
}
module.exports = { PROVIDERS, apiEndpoint, remoteChat };
