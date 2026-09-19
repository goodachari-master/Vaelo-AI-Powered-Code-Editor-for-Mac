/* Copyright (c) Microsoft Corporation. MIT License. VAELO / Preri additions. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { EventEmitter } = require('node:events');
const { repository, discover, downloadFile, importGGUF } = require('../import-model');
test('repository links accept public model repos and reject credentials, paths, non-HTTPS', () => {
	assert.deepEqual(repository('https://github.com/owner/model.git'), { host: 'github.com', owner: 'owner', repo: 'model' });
	for (const url of ['http://github.com/a/b', 'https://github.com/a/b/tree/main', 'https://key@github.com/a/b', 'https://evil.com/a/b']) { assert.throws(() => repository(url)); }
});
test('GitHub discovery imports release GGUF weights, never executable source or split weights', async () => {
	const files = await discover('https://github.com/a/b', undefined, async () => Response.json([{ assets: [
		{ name: 'install.sh' }, { name: 'model-00001-of-00002.gguf' }, { name: 'model.gguf', size: 8, browser_download_url: 'https://github.com/a/b/releases/download/v1/model.gguf' },
	] }]));
	assert.deepEqual(files.map(f => f.name), ['model.gguf']);
});
test('Hugging Face discovery constructs a download URL for selected weights', async () => {
	const files = await discover('https://huggingface.co/a/b', undefined, async () => Response.json([{ path: 'weights/model.gguf', size: 8 }]));
	assert.equal(files[0].url, 'https://huggingface.co/a/b/resolve/main/weights/model.gguf');
});
test('truncated model downloads remove partial files', async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'preri-test-')), file = path.join(dir, 'model.gguf');
	try {
		await assert.rejects(downloadFile({ url: 'https://github.com/a/b/model.gguf', size: 100 }, file, undefined, () => {}, async () => new Response('GGUF')), /incomplete/);
		await assert.rejects(fs.stat(file), { code: 'ENOENT' });
	} finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('GGUF import validates magic and launches only Ollama without a shell', async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'preri-test-')), file = path.join(dir, 'model.gguf');
	try {
		await fs.writeFile(file, 'version https://git-lfs.github.com/spec/v1');
		await assert.rejects(importGGUF(file, 'preri-test', 'http://localhost:11434', undefined, () => {}), /not a GGUF/);
		await fs.writeFile(file, 'GGUFtest');
		await importGGUF(file, 'preri-test', 'http://localhost:11434', undefined, () => {}, (cmd, args, options) => {
			assert.deepEqual({ cmd, args: args.slice(0, 3), shell: options.shell, host: options.env.OLLAMA_HOST }, { cmd: 'ollama', args: ['create', 'preri-test', '-f'], shell: false, host: 'http://localhost:11434' });
			const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter(); queueMicrotask(() => child.emit('close', 0)); return child;
		});
	} finally { await fs.rm(dir, { recursive: true, force: true }); }
});
