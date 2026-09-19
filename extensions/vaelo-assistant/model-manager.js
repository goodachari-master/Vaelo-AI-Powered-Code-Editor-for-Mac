/* Copyright (c) Microsoft Corporation. MIT License. VAELO / Preri additions. */
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { PROVIDERS, apiEndpoint, remoteChat } = require('./providers');
const { discover, downloadFile, importGGUF } = require('./import-model');
class ModelManager {
	constructor(vscode, context, client, progress) {
		this.vscode = vscode; this.context = context; this.client = client; this.progress = progress;
	}
	get profiles() { return this.context.globalState.get('preri.profiles', []); }
	find(id) { return this.profiles.find(p => p.id === id); }
	async save(profile) {
		await this.context.globalState.update('preri.profiles', [...this.profiles.filter(p => p.id !== profile.id), profile]);
	}
	async input(prompt, options = {}) { return this.vscode.window.showInputBox({ prompt: this.vscode.l10n.t(prompt), ignoreFocusOut: true, ...options }); }
	async confirm(text, button) {
		const t = this.vscode.l10n.t;
		return await this.vscode.window.showInformationMessage(t(text), { modal: true }, t(button)) === t(button);
	}
	async addAPI(signal) {
		const v = this.vscode;
		const provider = await v.window.showQuickPick(PROVIDERS.map(p => ({ ...p, label: p.name, description: p.protocol === 'copilot' ? 'Editor sign-in · No API key' : 'API key' })), { title: v.l10n.t('Preri · Choose API Provider') });
		if (!provider) { return; }
		const id = 'api-' + crypto.randomUUID();
		if (provider.protocol === 'copilot') {
			const models = await v.lm.selectChatModels({ vendor: 'copilot' });
			if (!models.length) { throw new Error('No Copilot model is available. Install and sign in to the official Copilot integration in a supported editor. A standalone VAELO fork may not have access. Choose an API provider instead.'); }
			const model = await v.window.showQuickPick(models.map(m => ({ label: m.name, description: m.id, model: m.id })), { title: v.l10n.t('Preri · Copilot Model') });
			if (!model) { return; }
			await this.save({ id, kind: 'api', protocol: 'copilot', model: model.model, name: 'Copilot / ' + model.label, detail: 'Copilot · Editor account', tested: false });
			return;
		}
		const raw = await this.input('Confirm the API base URL. Your key and requests will be sent only to this endpoint.', { value: provider.endpoint });
		if (!raw) { return; }
		const endpoint = apiEndpoint(raw.trim());
		const model = (await this.input('Enter the exact chat model ID from your provider account (not an API key).'))?.trim();
		if (!model) { return; }
		if (model.length > 250 || /[\r\n]/.test(model)) { throw new Error('Enter a valid model ID.'); }
		const key = await this.input('Paste your API key. It is stored in the editor credential vault, not in project files.', { password: true });
		if (!key) { return; }
		const profile = { id, kind: 'api', protocol: provider.protocol, provider: provider.id, endpoint, model, name: provider.name + ' / ' + model, detail: 'API · ' + new URL(endpoint).host, tested: true };
		if (!await this.confirm('Test and save this connection? A short test prompt will be sent to ' + endpoint + '. Provider usage charges may apply. Selected code and future chat will go to this provider when you use it.', 'Test and Save')) { return; }
		await remoteChat(profile, key.trim(), [{ role: 'user', content: 'Reply briefly: ready.' }], () => {}, signal);
		signal.throwIfAborted();
		await this.context.secrets.store(id, key.trim());
		try { await this.save(profile); } catch (error) { await this.context.secrets.delete(id); throw error; }
	}
	async chat(profile, messages, onText, signal) {
		if (profile.protocol !== 'copilot') { return remoteChat(profile, await this.context.secrets.get(profile.id), messages, onText, signal); }
		const v = this.vscode, models = await v.lm.selectChatModels({ vendor: 'copilot', id: profile.model });
		if (!models.length) { throw new Error('This Copilot model is unavailable. Check editor sign-in and subscription access.'); }
		const cancel = new v.CancellationTokenSource();
		const abort = () => cancel.cancel(); signal.addEventListener('abort', abort, { once: true });
		try {
			signal.throwIfAborted();
			const chat = messages.map(m => m.role === 'assistant' ? v.LanguageModelChatMessage.Assistant(m.content) : v.LanguageModelChatMessage.User(m.content));
			const response = await models[0].sendRequest(chat, {}, cancel.token);
			let text = '';
			for await (const chunk of response.text) { signal.throwIfAborted(); text += chunk; if (text.length > 500000) { throw new Error('Model output exceeded the response limit.'); } onText(chunk); }
			if (!text.trim()) { throw new Error('Copilot returned no answer.'); } return text;
		} finally { signal.removeEventListener('abort', abort); cancel.dispose(); }
	}
	async addInstalled(signal) {
		const response = await this.client().request('/api/tags', undefined, signal);
		const models = (await response.json()).models || [];
		if (!models.length) { throw new Error('No local models found in Ollama. Download or import a GGUF file first.'); }
		const picked = await this.vscode.window.showQuickPick(models.map(m => ({ label: m.name, description: ((m.size || 0) / 1073741824).toFixed(1) + ' GB' })), { title: this.vscode.l10n.t('Preri · Existing Ollama Model') });
		if (picked) { await this.save({ id: picked.label, kind: 'local', name: picked.label, detail: 'Local · Existing Ollama model' }); }
	}
	async importFile(file, signal) {
		const name = 'preri-' + crypto.randomUUID();
		await importGGUF(file, name, this.client().endpoint, signal, this.progress);
		await this.save({ id: name + ':latest', kind: 'local', name: path.basename(file, '.gguf'), detail: 'Local · Imported GGUF' });
	}
	async addFile(signal) {
		const files = await this.vscode.window.showOpenDialog({ canSelectMany: false, canSelectFolders: false, filters: { 'GGUF Model': ['gguf'] }, title: this.vscode.l10n.t('Preri · Load Local GGUF') });
		if (!files?.length) { return; }
		if (!await this.confirm('Import this GGUF into Ollama? Ollama will keep its own model data; additional disk space is required.', 'Import')) { return; }
		await this.importFile(files[0].fsPath, signal);
	}
	async addLink(signal) {
		const url = await this.input('Paste a public GitHub or Hugging Face model repository URL.');
		if (!url) { return; }
		this.progress('Looking for downloadable GGUF model files…');
		const assets = await discover(url.trim(), AbortSignal.any([signal, AbortSignal.timeout(60000)]));
		if (!assets.length) { throw new Error('No single-file GGUF model found. GitHub imports look in release assets; Hugging Face imports look in the main branch. A code-only repository is not a model. Use a GGUF repository or Load Local File.'); }
		const asset = await this.vscode.window.showQuickPick(assets.map(a => ({ ...a, label: a.name, description: a.size ? (a.size / 1073741824).toFixed(1) + ' GB' : 'Size unknown' })), { title: this.vscode.l10n.t('Preri · Choose Model File') });
		if (!asset) { return; }
		if (!await this.confirm('Download and import ' + asset.name + ' (' + asset.description + ')? Check the model license on its repository. Importing temporarily needs space for both the download and Ollama copy.', 'Download')) { return; }
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'preri-download-'));
		try {
			const file = path.join(dir, path.basename(asset.name));
			await downloadFile(asset, file, signal, this.progress);
			await this.importFile(file, signal);
		} finally { await fs.rm(dir, { recursive: true, force: true }); }
	}
	async remove(id) {
		if (!this.find(id)) { return; }
		if (!await this.confirm('Remove this Preri connection and its stored API key? Downloaded Ollama model files will stay on disk.', 'Remove')) { return false; }
		await this.context.secrets.delete(id);
		await this.context.globalState.update('preri.profiles', this.profiles.filter(p => p.id !== id)); return true;
	}
}
module.exports = { ModelManager };
