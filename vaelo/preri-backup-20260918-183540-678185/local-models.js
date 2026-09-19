/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * VAELO / Preri additions by M Sai Sanjeev. Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
'use strict';
const MODELS = Object.freeze([
	{ id: 'qwen3-coder:30b', name: 'Qwen3-Coder 30B', detail: 'Coding · 30B total / 3.3B active', downloadGB: 19 },
	{ id: 'gemma4:26b', name: 'Gemma 4 26B A4B', detail: 'General reasoning and code · 26B / 4B active', downloadGB: 19 },
	{ id: 'devstral:24b', name: 'Devstral Small 24B', detail: 'Software engineering · 24B dense', downloadGB: 14 },
]);
function knownModel(id) {
	const model = MODELS.find(item => item.id === id);
	if (!model) { throw new Error('Choose one of the three Preri models.'); }
	return model;
}
function localEndpoint(value) {
	const url = new URL(value);
	if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
		throw new Error('Use a local Ollama address such as http://127.0.0.1:11434.');
	}
	return url.origin;
}
async function ndjson(response, onItem) {
	if (!response.body) { throw new Error('Ollama returned an empty stream.'); }
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let pending = '';
	function emit(line) {
		if (!line.trim()) { return; }
		const item = JSON.parse(line);
		if (item.error) { throw new Error(item.error); }
		onItem(item);
	}
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) { break; }
			pending += decoder.decode(value, { stream: true });
			if (pending.length > 4000000) { throw new Error('Ollama returned an oversized stream record.'); }
			let newline;
			while ((newline = pending.indexOf('\n')) >= 0) {
				emit(pending.slice(0, newline)); pending = pending.slice(newline + 1);
			}
		}
		pending += decoder.decode(); emit(pending);
	} catch (error) {
		await reader.cancel().catch(() => {}); throw error;
	} finally { reader.releaseLock(); }
}
class LocalModels {
	constructor(endpoint = 'http://127.0.0.1:11434', fetchImpl = fetch, catalog = MODELS) {
		this.endpoint = localEndpoint(endpoint); this.fetch = fetchImpl; this.catalog = catalog;
	}
	known(id) {
		if (!this.catalog.some(m => m.id === id)) { throw new Error('Choose a registered Preri model.'); }
	}
	async request(route, body, signal, timeout = 120000) {
		const timed = AbortSignal.timeout(timeout);
		const response = await this.fetch(this.endpoint + route, {
			method: body === undefined ? 'GET' : 'POST',
			headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: signal ? AbortSignal.any([signal, timed]) : timed,
		});
		if (!response.ok) {
			let detail = '';
			try { detail = (await response.json()).error || ''; } catch {}
			throw new Error(`Ollama HTTP ${response.status}${detail ? ': ' + detail : ''}`);
		}
		return response;
	}
	async status() {
		const [tags, running] = await Promise.all([
			this.request('/api/tags', undefined, undefined, 5000).then(r => r.json()),
			this.request('/api/ps', undefined, undefined, 5000).then(r => r.json()),
		]);
		return this.catalog.map(model => ({ ...model,
			installed: (tags.models || []).some(item => (item.name || item.model) === model.id),
			loaded: (running.models || []).some(item => (item.name || item.model) === model.id),
		}));
	}
	async pull(id, progress, signal) {
		this.known(id); let success = false;
		const response = await this.request('/api/pull', { model: id, stream: true }, signal, 86400000);
		await ndjson(response, item => { if (item.status === 'success') { success = true; } progress(item); });
		if (!success) { throw new Error('The download ended before Ollama confirmed success. Refresh and retry.'); }
	}
	async activate(id, previous, signal) {
		this.known(id);
		const status = await this.status();
		if (!status.find(model => model.id === id).installed) { throw new Error('Download this model before activating it.'); }
		if (previous && previous !== id) {
			this.known(previous);
			await this.request('/api/generate', { model: previous, keep_alive: 0, stream: false }, signal);
		}
		const response = await this.request('/api/generate', { model: id, keep_alive: '5m', stream: false, options: { num_ctx: 8192 } }, signal, 600000);
		const result = await response.json();
		if (result.error || result.done !== true) { throw new Error(result.error || 'Ollama did not finish loading the model.'); }
		return id;
	}
	async chat(id, messages, onText, signal, contextSize = 8192) {
		this.known(id); let text = '', done = false;
		const response = await this.request('/api/chat', {
			model: id, messages, stream: true, keep_alive: '5m',
			options: { num_ctx: contextSize, num_predict: 4096 },
		}, signal, 900000);
		await ndjson(response, item => {
			if (typeof item.message?.content === 'string') { text += item.message.content; onText(item.message.content); }
			if (text.length > 500000) { throw new Error('Model output exceeded the response limit.'); }
			if (item.done) { done = true; }
		});
		if (!done) { throw new Error('The response was interrupted before completion.'); }
		if (!text.trim()) { throw new Error('The model returned no answer.'); }
		return text;
	}
}
module.exports = { MODELS, LocalModels, knownModel, localEndpoint, ndjson };
