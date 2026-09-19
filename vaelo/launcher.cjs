/* Copyright (c) Microsoft Corporation. MIT License. VAELO additions. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
function buildEnvironment(base, commit) {
	return { ...base, BUILD_SOURCEVERSION: commit, VSCODE_QUALITY: base.VSCODE_QUALITY || 'insider', VSCODE_PUBLISH_COUNTER: base.VSCODE_PUBLISH_COUNTER || '0' };
}
function ensureRepository(root, run) {
	if (!fs.existsSync(path.join(root, '.git'))) { run('git', ['init']); }
}
function main(root, argv = process.argv.slice(2)) {
	const upstream = JSON.parse(fs.readFileSync(path.join(root, 'vaelo/upstream.json'), 'utf8'));
	const required = upstream.node.split('.').map(Number), actual = process.versions.node.split('.').map(Number);
	if (actual[0] !== required[0] || actual[1] < required[1] || (actual[1] === required[1] && actual[2] < required[2])) {
		throw new Error(`Use Node ${upstream.node} or newer on Node ${required[0]}. Current: ${process.versions.node}. See VAELO_START_HERE.md.`);
	}
	const env = buildEnvironment(process.env, upstream.commit), npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
	function run(command, args) {
		const result = cp.spawnSync(command, args, { cwd: root, stdio: 'inherit', env, shell: process.platform === 'win32' });
		if (result.error) { throw result.error; }
		if (result.status !== 0) { throw new Error(`${command} exited with ${result.status}. Resolve that error before continuing.`); }
	}
	const action = argv[0] || 'help';
	if (['install','compile','watch','run','package'].includes(action)) { ensureRepository(root, run); }
	if (action === 'doctor') {
		console.log(`VAELO / Preri 0.6\nNode: ${process.versions.node}\nArchitecture: ${process.arch}\nMemory: ${Math.round(require('node:os').totalmem()/1073741824)} GB\nGit metadata: ${fs.existsSync(path.join(root,'.git'))?'present':'will be initialized automatically'}\nBuild quality: ${env.VSCODE_QUALITY}\nPublish counter: ${env.VSCODE_PUBLISH_COUNTER}`);
		for (const command of ['git','python3','ollama']) {
			const result = cp.spawnSync(command, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
			console.log(command + ': ' + (result.status === 0 ? result.stdout.trim() : 'not found or not ready'));
		}
	} else if (action === 'install') { run(npm, ['install']); }
	else if (action === 'compile' || action === 'watch') { run(npm, ['run', action]); }
	else if (action === 'run') { run(process.platform === 'win32' ? 'cmd.exe' : 'bash', process.platform === 'win32' ? ['/c','scripts\\code.bat'] : ['scripts/code.sh']); }
	else if (action === 'package') {
		if (!['darwin','linux','win32'].includes(process.platform) || !['x64','arm64'].includes(process.arch)) { throw new Error('Package on macOS, Linux or Windows, x64 or ARM64.'); }
		run(npm, ['run','gulp','--',`vscode-${process.platform}-${process.arch}`]);
		console.log('App output: ' + path.join(path.dirname(root), `VSCode-${process.platform}-${process.arch}`));
	} else if (action === 'test') { run(process.execPath, ['--test','extensions/vaelo-assistant/test/local-models.test.cjs','extensions/vaelo-assistant/test/extension.test.cjs','extensions/vaelo-assistant/test/providers.test.cjs','extensions/vaelo-assistant/test/import-model.test.cjs','extensions/vaelo-assistant/test/model-manager.test.cjs','vaelo/launcher.test.cjs']); }
	else if (action !== 'doctor') { console.log('node scripts/vaelo.cjs doctor | install | compile | run | watch | package | test'); }
}
module.exports = { main, buildEnvironment, ensureRepository };
