/* Copyright (c) Microsoft Corporation. MIT License. VAELO / Preri additions. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const providers = require('../providers');
function harness(fail = false) {
	const profiles = new Map(), secrets = new Map();
	const answers = ['https://api.openai.com/v1', 'my-model', 'my-secret'];
	const vscode = { l10n: { t: x => x }, window: { showQuickPick: async () => providers.PROVIDERS[0], showInputBox: async () => answers.shift(), showInformationMessage: async (_, __, button) => button } };
	const context = { globalState: { get: (key, fallback) => profiles.get(key) || fallback, update: async (key, value) => profiles.set(key, value) }, secrets: { store: async (key, value) => secrets.set(key, value), get: async key => secrets.get(key), delete: async key => secrets.delete(key) } };
	const module = { exports: {} };
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../model-manager.js'), 'utf8'), { module, exports: module.exports, URL, require: name => name === './providers' ? { ...providers, remoteChat: async () => { if (fail) { throw Error('Provider HTTP 401'); } return 'ready'; } } : require(name.startsWith('./') ? '../' + name.slice(2) : name) });
	return { manager: new module.exports.ModelManager(vscode, context), profiles, secrets };
}
test('API credentials are kept out of persisted profiles and removed with the connection', async () => {
	const h = harness(); await h.manager.addAPI(new AbortController().signal);
	const profile = h.manager.profiles[0];
	assert.equal(JSON.stringify(profile).includes('my-secret'), false);
	assert.equal(h.secrets.get(profile.id), 'my-secret');
	await h.manager.remove(profile.id);
	assert.equal(h.manager.profiles.length + h.secrets.size, 0);
});
test('failed API connection tests do not persist a profile or secret', async () => {
	const h = harness(true); await assert.rejects(h.manager.addAPI(new AbortController().signal), /401/);
	assert.equal(h.manager.profiles.length + h.secrets.size, 0);
});
