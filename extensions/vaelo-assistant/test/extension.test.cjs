/* Copyright (c) Microsoft Corporation. MIT License. VAELO / Preri additions. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const realModels=require('../local-models');
function harness(failLoad=false){
	const commands=new Map(),stored=new Map([['preri.active','qwen3-coder:30b']]);
	const events=[];
	const mock={
		l10n:{t:(s,...args)=>s.replace(/\{(\d+)\}/g,(_,n)=>String(args[n]))},
		window:{
			showQuickPick:async()=>({id:'gemma4:26b'}),
			showWarningMessage:async()=> 'Continue',
			showErrorMessage:message=>events.push(message),
			registerWebviewViewProvider:()=>({dispose(){}}),
		},
		commands:{registerCommand:(id,fn)=>{commands.set(id,fn);return {dispose(){}};}},
		workspace:{getConfiguration:()=>({get:(_,fallback)=>fallback})},
	};
	class FakeModels {
		async status(){return realModels.MODELS.map(m=>({...m,installed:true,loaded:false}));}
		async activate(){if(failLoad){throw Error('Not enough memory');}return 'gemma4:26b';}
	}
	const module={exports:{}};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../extension.js'),'utf8'),{
		module,exports:module.exports,AbortController,fetch,
		require:name=>name==='vscode'?mock:name==='./local-models'?{...realModels,LocalModels:FakeModels}:require(name.startsWith('./')?'../'+name.slice(2):name),
	});
	module.exports.activate({subscriptions:[],globalState:{get:(key,fallback)=>stored.has(key)?stored.get(key):fallback,update:async(key,value)=>stored.set(key,value)}});
	return {commands,stored,events};
}
test('Preri persists a successfully activated model',async()=>{
	const h=harness();await h.commands.get('preri.selectModel')();assert.equal(h.stored.get('preri.active'),'gemma4:26b');
});
test('Preri retains selection and reports a failed model activation',async()=>{
	const h=harness(true);await h.commands.get('preri.selectModel')();assert.deepEqual({active:h.stored.get('preri.active'),error:h.events[0]},{active:'qwen3-coder:30b',error:'Preri: Not enough memory'});
});
