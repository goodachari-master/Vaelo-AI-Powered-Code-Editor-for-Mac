/* Copyright (c) Microsoft Corporation. MIT License. VAELO additions. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {buildEnvironment,ensureRepository}=require('./launcher.cjs');
test('ZIP source installs initialize local Git metadata required by upstream postinstall',()=>{
	const folder=fs.mkdtempSync(path.join(os.tmpdir(),'vaelo-launcher-'));
	try{const calls=[];ensureRepository(folder,(cmd,args)=>calls.push([cmd,args]));assert.deepEqual(calls,[['git',['init']]]);}finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('existing Git repository is not reinitialized',()=>{
	const folder=fs.mkdtempSync(path.join(os.tmpdir(),'vaelo-launcher-'));
	try{fs.mkdirSync(path.join(folder,'.git'));ensureRepository(folder,()=>assert.fail('must preserve repository'));}finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('Copilot receives required CI version fields whenever BUILD_SOURCEVERSION is set',()=>{
	assert.deepEqual(buildEnvironment({},'a'.repeat(40)),{BUILD_SOURCEVERSION:'a'.repeat(40),VSCODE_QUALITY:'insider',VSCODE_PUBLISH_COUNTER:'0'});
});
test('explicit pipeline build values are preserved',()=>{
	const env=buildEnvironment({VSCODE_QUALITY:'stable',VSCODE_PUBLISH_COUNTER:'7'},'b'.repeat(40));
	assert.deepEqual([env.VSCODE_QUALITY,env.VSCODE_PUBLISH_COUNTER],['stable','7']);
});
