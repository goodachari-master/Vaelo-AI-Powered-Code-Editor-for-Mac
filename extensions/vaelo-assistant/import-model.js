/* Copyright (c) Microsoft Corporation. MIT License. VAELO / Preri additions. */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
function repository(value) {
	const url = new URL(value);
	const match = /^\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(url.pathname);
	if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['github.com', 'huggingface.co'].includes(url.hostname) || !match) {
		throw new Error('Paste a public https://github.com/owner/repo or https://huggingface.co/owner/repo model repository URL.');
	}
	return { host: url.hostname, owner: match[1], repo: match[2] };
}
async function discover(value, signal, fetchImpl = fetch) {
	const r = repository(value), github = r.host === 'github.com';
	const url = github ? `https://api.github.com/repos/${r.owner}/${r.repo}/releases?per_page=100` : `https://huggingface.co/api/models/${r.owner}/${r.repo}/tree/main?recursive=true&limit=1000`;
	const response = await fetchImpl(url, { signal, headers: { Accept: 'application/json' } });
	if (!response.ok) { throw new Error(`Repository HTTP ${response.status}. Use a public model repository; private/gated downloads need a manual local file.`); }
	const data = await response.json();
	const items = github ? data.flatMap(release => release.assets || []) : data;
	return items.filter(item => /\.gguf$/i.test(item.name || item.path) && !/-\d{5}-of-\d{5}\.gguf$/i.test(item.name || item.path)).map(item => ({
		name: item.name || item.path, size: item.size || 0,
		url: github ? item.browser_download_url : `https://huggingface.co/${r.owner}/${r.repo}/resolve/main/${item.path.split('/').map(encodeURIComponent).join('/')}`,
	}));
}
async function downloadFile(asset, destination, signal, progress, fetchImpl = fetch) {
	const url = new URL(asset.url);
	if (url.protocol !== 'https:' || !['github.com', 'huggingface.co'].includes(url.hostname) || url.username || url.password) { throw new Error('Unsupported model download host.'); }
	const response = await fetchImpl(url, { signal });
	if (!response.ok || !response.body) { throw new Error(`Model download failed: HTTP ${response.status}.`); }
	const total = Number(response.headers.get('content-length')) || asset.size;
	const handle = await fs.open(destination, 'wx');
	let received = 0, last = 0;
	try {
		for await (const chunk of response.body) {
			signal?.throwIfAborted(); await handle.writeFile(chunk); received += chunk.length;
			if (received > 200 * 1073741824) { throw new Error('Download exceeded the 200 GB import limit.'); }
			if (Date.now() - last > 500) { progress(`${(received / 1073741824).toFixed(2)} GB${total ? ' / ' + (total / 1073741824).toFixed(2) + ' GB' : ''}`); last = Date.now(); }
		}
		if (total && total !== received) { throw new Error('Model download was incomplete.'); }
	} catch (error) { await handle.close(); await fs.rm(destination, { force: true }); throw error; }
	await handle.close();
}
async function importGGUF(file, model, endpoint, signal, progress, spawnImpl = spawn) {
	if (!/^preri-[a-z0-9-]+$/.test(model)) { throw new Error('Invalid import model name.'); }
	if (!path.isAbsolute(file) || /[\r\n"\\]/.test(file.replace(/\\/g, '/'))) { throw new Error('Unsupported file path.'); }
	const handle = await fs.open(file, 'r');
	try {
		const magic = Buffer.alloc(4); await handle.read(magic, 0, 4, 0);
		if (magic.toString() !== 'GGUF') { throw new Error('This is not a GGUF model file. Git LFS pointers and source code cannot be loaded as models.'); }
	} finally { await handle.close(); }
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'preri-import-'));
	try {
		const modelfile = path.join(dir, 'Modelfile');
		await fs.writeFile(modelfile, 'FROM "' + file.replace(/\\/g, '/') + '"\n');
		await new Promise((resolve, reject) => {
			const child = spawnImpl('ollama', ['create', model, '-f', modelfile], { shell: false, env: { ...process.env, OLLAMA_HOST: endpoint }, signal });
			let tail = '';
			const consume = chunk => { tail = (tail + chunk.toString().replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')).slice(-1000); progress('Importing GGUF into Ollama…'); };
			child.stdout.on('data', consume); child.stderr.on('data', consume);
			child.on('error', error => reject(error.code === 'ENOENT' ? new Error('Install Ollama and ensure its command is on PATH, then restart the editor.') : error));
			child.on('close', code => code === 0 ? resolve() : reject(new Error('Ollama import failed: ' + tail)));
		});
	} finally { await fs.rm(dir, { recursive: true, force: true }); }
}
module.exports = { repository, discover, downloadFile, importGGUF };
