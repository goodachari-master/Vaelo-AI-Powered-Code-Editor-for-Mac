/* Copyright (c) Microsoft Corporation. MIT License. VAELO / Preri additions. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MODELS, LocalModels, ndjson, localEndpoint } = require('../local-models');
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }); }
function stream(parts) { return new Response(new ReadableStream({ start(controller) { for (const part of parts) { controller.enqueue(new TextEncoder().encode(part)); } controller.close(); } })); }
test('exactly the three requested model IDs are available', () => {
	assert.deepEqual(MODELS.map(m => m.id), ['qwen3-coder:30b', 'gemma4:26b', 'devstral:24b']);
});
test('local inference rejects remote URLs and URL credentials', () => {
	for (const url of ['https://remote.example','http://remote.example','http://key@localhost:11434','http://localhost:11434/path']) { assert.throws(() => localEndpoint(url)); }
	assert.equal(localEndpoint('http://127.0.0.1:11434/'), 'http://127.0.0.1:11434');
});
test('download status and loaded status are separate', async () => {
	const api = new LocalModels(undefined, async url => json(url.endsWith('/api/tags') ? {models:[{name:MODELS[0].id}]} : {models:[]}));
	const status = await api.status();
	assert.deepEqual(status.map(m => [m.installed,m.loaded]), [[true,false],[false,false],[false,false]]);
});
test('download progress handles split JSON records', async () => {
	const values = [];
	await ndjson(stream(['{"status":"pull','ing","completed":5,"total":10}\n{"status":"success"}\n']), v => values.push(v));
	assert.deepEqual(values.map(v => v.status), ['pulling','success']);
});
test('pull requires an explicit successful completion', async () => {
	const api = new LocalModels(undefined, async () => stream(['{"status":"pulling"}\n']));
	await assert.rejects(api.pull(MODELS[0].id, () => {}), /before Ollama confirmed/);
});
test('stream errors are not treated as successful downloads', async () => {
	const api = new LocalModels(undefined, async () => stream(['{"error":"disk full"}\n']));
	await assert.rejects(api.pull(MODELS[0].id, () => {}), /disk full/);
});
test('activation unloads only the previously selected Preri model and warms chosen model', async () => {
	const calls = [];
	const api = new LocalModels(undefined, async (url, options) => {
		if (url.endsWith('/api/tags')) { return json({models:MODELS.map(m => ({name:m.id}))}); }
		if (url.endsWith('/api/ps')) { return json({models:[]}); }
		calls.push(JSON.parse(options.body)); return json({done:true});
	});
	const selected = await api.activate(MODELS[1].id, MODELS[0].id);
	assert.deepEqual({selected,models:calls.map(c=>c.model),keep:calls.map(c=>c.keep_alive)}, {selected:MODELS[1].id,models:[MODELS[0].id,MODELS[1].id],keep:[0,'5m']});
});
test('missing model never unloads the previous selection', async () => {
	const api = new LocalModels(undefined, async (url, options) => { assert.equal(options.method, 'GET'); return json({models:[]}); });
	await assert.rejects(api.activate(MODELS[1].id, MODELS[0].id), /Download/);
});
test('failed warmup is reported and cannot return an activated ID', async () => {
	const api = new LocalModels(undefined, async url => url.endsWith('/api/tags') ? json({models:[{name:MODELS[0].id}]}) : url.endsWith('/api/ps') ? json({models:[]}) : json({error:'not enough memory'}, 500));
	await assert.rejects(api.activate(MODELS[0].id), /not enough memory/);
});
test('chat sends only selected model, includes bounded context and streams content', async () => {
	let body;const chunks = [];
	const api = new LocalModels(undefined, async (url, options) => { body=JSON.parse(options.body);return stream(['{"message":{"content":"Hello "},"done":false}\n','{"message":{"content":"世界"},"done":true}\n']); });
	const result = await api.chat(MODELS[2].id, [{role:'user',content:'hi'}], text => chunks.push(text));
	assert.deepEqual({model:body.model,context:body.options.num_ctx,result,chunks},{model:MODELS[2].id,context:8192,result:'Hello 世界',chunks:['Hello ','世界']});
});
test('truncated chat stream does not produce a successful answer', async () => {
	const api = new LocalModels(undefined, async () => stream(['{"message":{"content":"partial"}}\n']));
	await assert.rejects(api.chat(MODELS[0].id, [], () => {}), /interrupted/);
});
test('request receives the cancellation signal', async () => {
	const controller = new AbortController();controller.abort();
	const api = new LocalModels(undefined, async (url, options) => { options.signal.throwIfAborted(); });
	await assert.rejects(api.chat(MODELS[0].id, [], () => {}, controller.signal), error => error.name === 'AbortError');
});
test('unrecognized model cannot initiate a network request', async () => {
	const api = new LocalModels(undefined, async () => { throw new Error('Network should not run'); });
	await assert.rejects(api.pull('other:999b', () => {}), /registered Preri model/);
});
