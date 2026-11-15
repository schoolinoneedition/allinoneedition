'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('appearance.js','utf8'),setup=fs.readFileSync('ultimate-experience.js','utf8');
const saved=new Map(),properties=new Map();
const document={documentElement:{dataset:{},style:{setProperty:(k,v)=>properties.set(k,v)}},getElementById:()=>null,querySelectorAll:()=>[],addEventListener:()=>{}};
const context={document,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},window:{addEventListener:()=>{},dispatchEvent:()=>{}},Event:class{},console};
vm.runInNewContext(source,context);const api=context.window.AIOAppearance;
(async()=>{
 assert.equal(api.getCursors().length,11);
 for(const cursor of api.getCursors()){assert.match(cursor.preview,/^data:image\/svg\+xml,/);assert.notEqual(cursor.preview,cursor.pointer);const xml=decodeURIComponent(cursor.preview.split(',')[1]);assert.match(xml,/<svg/);assert.ok(!xml.includes('<script'))}
 await api.setChoice({cursorStyle:'ocean',cursorSize:36,font:'system',navPosition:'bottom'});
 assert.equal(document.documentElement.dataset.aioCursorStyle,'ocean');assert.match(properties.get('--aio-pointer'),/width%3D%2236%22/);
 assert.equal(JSON.parse(saved.get('aio-appearance-v1')).cursorStyle,'ocean');
 await api.setChoice({cursorStyle:'javascript:bad',cursorColor:'red;bad',navPosition:'unknown'});
 assert.equal(api.getState().cursorStyle,'ocean');assert.equal(api.getState().navPosition,'bottom');
 await api.setChoice({cursorStyle:'default'});assert.equal(document.documentElement.dataset.aioCursorStyle,'default');
 const fresh={...context,window:{addEventListener:()=>{},dispatchEvent:()=>{}}};vm.runInNewContext(source,fresh);assert.equal(fresh.window.AIOAppearance.getState().navPosition,'bottom');
 const helper=setup.slice(setup.indexOf('function setupSaved()'),setup.indexOf('let step='));
 const check=new vm.Script(helper+';setupSaved()');
 const run=()=>check.runInNewContext({localStorage:context.localStorage,KEY:'aio-ultimate-onboarding-v1'});
 assert.equal(run(),true,'Existing appearance preferences migrate without replaying setup');
 saved.clear();assert.equal(run(),false,'Genuine first visit gets setup');
 saved.set('aio-ultimate-onboarding-v1',JSON.stringify({completed:true}));assert.equal(run(),true,'Completed setup survives new script versions');
 saved.set('aio-ultimate-onboarding-v1',JSON.stringify({dismissed:true}));assert.equal(run(),true,'Closing setup is remembered');
 assert.equal(check.runInNewContext({localStorage:{getItem:()=>{throw Error('disabled')}},KEY:'setup'}),true,'Unavailable storage cannot crash boot');
 console.log('Personalisation: real pointer pairs, validation, sizes, reset, persistence, migration and denied storage passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
