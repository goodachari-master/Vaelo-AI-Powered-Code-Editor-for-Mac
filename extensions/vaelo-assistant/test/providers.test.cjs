/* Copyright (c) Microsoft Corporation. MIT License. VAELO / Preri additions. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PROVIDERS, apiEndpoint, remoteChat } = require('../providers');
const messages = [{ role: 'system', content: 'Preri' }, { role: 'user', content: 'Hello' }];
test('twenty named providers and custom are available with distinct IDs', () => {
	assert.equal(new Set(PROVIDERS.map(p => p.id)).size, 21);
	assert.equal(PROVIDERS.find(p => p.id === 'copilot').protocol, 'copilot');
});
test('API URLs reject plaintext remote servers and URL credentials', () => {
	for (const url of ['http://evil.example/v1', 'https://key:secret@example.com/v1', 'https://example.com?key=secret', 'file:///tmp/key']) { assert.throws(() => apiEndpoint(url)); }
	assert.equal(apiEndpoint('http://127.0.0.1:1234/v1/'), 'http://127.0.0.1:1234/v1');
});
test('OpenAI-compatible providers keep keys in headers and disallow redirects', async () => {
	for (const provider of PROVIDERS.filter(p => p.protocol === 'openai' && p.endpoint)) {
		const answer = await remoteChat({ ...provider, model: 'selected-model' }, 'test-secret', messages, () => {}, new AbortController().signal, async (url, init) => {
			assert.deepEqual({ url, auth: init.headers.Authorization, body: JSON.parse(init.body), redirects: init.redirect }, {
				url: provider.endpoint + '/chat/completions', auth: 'Bearer test-secret', body: { model: 'selected-model', messages, stream: false }, redirects: 'error',
			});
			return Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Ready' } }] });
		}); assert.equal(answer, 'Ready');
	}
});
test('Anthropic separates system prompt and uses its own auth protocol', async () => {
	await remoteChat({ endpoint: 'https://api.anthropic.com/v1', model: 'claude', protocol: 'anthropic' }, 'secret', messages, () => {}, undefined, async (url, init) => {
		assert.deepEqual({ url, key: init.headers['x-api-key'], auth: init.headers.Authorization, body: JSON.parse(init.body) }, {
			url: 'https://api.anthropic.com/v1/messages', key: 'secret', auth: undefined, body: { model: 'claude', max_tokens: 4096, system: 'Preri', messages: [messages[1]], stream: false },
		}); return Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Ready' }] });
	});
});
test('provider errors never echo reflected API keys and truncated output is rejected', async () => {
	const profile = { endpoint: 'https://example.com/v1', model: 'test' };
	await assert.rejects(remoteChat(profile, 'secret', messages, () => {}, undefined, async () => Response.json({ error: 'secret' }, { status: 401 })), error => /401/.test(error.message) && !error.message.includes('secret'));
	await assert.rejects(remoteChat(profile, 'secret', messages, () => {}, undefined, async () => Response.json({ choices: [{ finish_reason: 'length', message: { content: 'partial' } }] })), /complete text answer/);
});
test('API cancellation reaches fetch', async () => {
	const controller = new AbortController(); controller.abort();
	await assert.rejects(remoteChat({ endpoint: 'https://example.com', model: 'test' }, 'secret', messages, () => {}, controller.signal, async (_, init) => { init.signal.throwIfAborted(); }), { name: 'AbortError' });
});

test('malformed keys are rejected before headers can echo credential text', async () => {
	await assert.rejects(remoteChat({ endpoint: 'https://example.com', model: 'test' }, 'private\ncredential', messages, () => {}, undefined, async () => { throw Error('fetch must not run'); }), error => /control characters/.test(error.message) && !error.message.includes('private'));
});
