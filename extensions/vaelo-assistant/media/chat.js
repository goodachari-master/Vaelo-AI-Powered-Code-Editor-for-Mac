/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * VAELO / Preri additions by M Sai Sanjeev. Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/
'use strict';
const api = acquireVsCodeApi();
const $ = id => document.getElementById(id);
let response, busy = false, active = '', models = [];
const post = (type, values = {}) => api.postMessage({ type, ...values });

function line(role, text) {
	const article = document.createElement('article');
	const label = document.createElement('small'); label.textContent = role;
	const content = document.createElement('pre'); content.textContent = text;
	article.append(label, content); $('thread').append(article);
	article.scrollIntoView({ block: 'end', behavior: 'smooth' });
	return content;
}

function renderModels() {
	$('models').replaceChildren();
	if (!models.length) {
		const hint = document.createElement('p');
		hint.textContent = 'No models added yet. Click + Add Model → Use Existing Ollama Model or Connect API Provider.';
		$('models').append(hint);
	}
	for (const model of models) {
		const card = document.createElement('article'); card.className = 'model' + (active === model.id ? ' selected' : '');
		const title = document.createElement('h3'); title.textContent = model.name;
		const detail = document.createElement('p'); detail.textContent = model.detail;
		const status = document.createElement('small'); status.textContent = (active === model.id ? 'SELECTED · ' : '') + (model.kind === 'api' ? model.tested ? 'API · Connection tested' : 'API · Test on activation' : model.loaded ? 'Loaded in memory' : model.installed ? 'Installed in Ollama' : 'Unavailable — check Ollama, then Refresh');
		const button = document.createElement('button'); button.textContent = model.installed ? active === model.id ? 'Activate Again' : 'Activate' : 'Unavailable'; button.disabled = busy || !model.installed;
		button.onclick = () => post('activate', { id: model.id });
		card.append(title, detail, status, button);
		if (model.removable) { const remove = document.createElement('button'); remove.textContent = 'Remove'; remove.disabled = busy; remove.onclick = () => post('remove', { id: model.id }); card.append(remove); }
		$('models').append(card);
	}
}

function renderHistory(items) {
	const list = $('history-list');
	const badge = $('history-count');
	badge.textContent = items.length;
	badge.className = 'history-badge' + (items.length ? ' history-badge--has' : '');

	list.replaceChildren();
	if (!items.length) {
		const empty = document.createElement('p');
		empty.className = 'history-empty';
		empty.textContent = 'No edits applied yet. Applied edits appear here for review and revert.';
		list.append(empty);
		return;
	}
	for (const item of items) {
		const entry = document.createElement('div');
		entry.className = 'history-item';

		const info = document.createElement('div');
		info.className = 'history-item-info';

		const name = document.createElement('span');
		name.className = 'history-item-label';
		name.textContent = item.label;

		const ts = document.createElement('span');
		ts.className = 'history-item-time';
		const d = new Date(item.timestamp);
		ts.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

		info.append(name, ts);

		const revert = document.createElement('button');
		revert.className = 'revert-btn';
		revert.textContent = '↩ Revert';
		revert.title = 'Restore this file to its state before this edit';
		revert.onclick = () => post('revert', { historyId: item.id });

		entry.append(info, revert);
		list.append(entry);
	}
}

$('add').onclick = () => { $('add-panel').hidden = false; $('close-add').focus(); };
$('close-add').onclick = () => { $('add-panel').hidden = true; $('add').focus(); };
for (const id of ['add-api', 'add-link', 'add-file', 'add-installed']) { $(id).onclick = () => post(id); }
for (const id of ['projects','clone','recent','refresh','ollama','clear','stop','propose','apply']) { $(id).onclick = () => post(id); }
$('run').onclick = () => post('run');

$('form').onsubmit = event => {
	event.preventDefault(); if (busy) { return; }
	const text = $('message').value.trim(); if (!text) { return; }
	line('YOU', text + ($('attach').checked ? '\n[Editor context attached]' : ''));
	post('chat', { text, attach: $('attach').checked }); $('message').value = '';
};
$('message').onkeydown = event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { $('form').requestSubmit(); } };

window.addEventListener('message', event => {
	const data = event.data;
	if (data.type === 'models') {
		models = data.models; active = data.active;
		$('connection').textContent = data.online ? '● Ollama Connected' : '○ Ollama Offline — Open Ollama, Then Refresh';
		$('memory').textContent = `${data.memoryGB} GB system RAM detected. Memory requirements depend on your selected local model and context size.`;
		$('active').textContent = active ? 'PRERI / ' + (models.find(m => m.id === active)?.name || active) + (models.find(m => m.id === active)?.kind === 'api' ? ' · Sends to provider' : ' · Local') : 'Activate a local model or API connection to begin.';
		renderModels();
	}
	if (data.type === 'busy') {
		busy = data.value;
		for (const id of ['add-api', 'add-link', 'add-file', 'add-installed']) { $(id).disabled = busy; }
		$('send').disabled = busy; $('clear').disabled = busy; $('propose').disabled = busy;
		$('run').disabled = busy;
		$('stop').disabled = !busy;
		renderModels();
	}
	if (data.type === 'download') { $('status').textContent = `${data.text}${data.percent === undefined ? '' : ' · ' + data.percent + '%'}`; }
	if (data.type === 'status') { $('status').textContent = data.text; }
	if (data.type === 'user') { line('YOU', data.text); }
	if (data.type === 'start') { response = line('PRERI', ''); $('status').textContent = 'Preri is thinking…'; }
	if (data.type === 'chunk' && response) { response.textContent += data.text; }
	if (data.type === 'done') { $('status').textContent = 'Response complete.'; }
	if (data.type === 'incomplete') { if (response) { response.textContent += '\n\n[Incomplete response]'; } }
	if (data.type === 'reset') { $('thread').replaceChildren(); response = undefined; }
	if (data.type === 'history') { renderHistory(data.items); }
});
post('ready');
