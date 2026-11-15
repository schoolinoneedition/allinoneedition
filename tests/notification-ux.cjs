'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('aio-notifications.js','utf8');
const css=fs.readFileSync('aio-notifications.css','utf8');
const setup=fs.readFileSync('ultimate-experience.js','utf8');
const appearance=fs.readFileSync('appearance.js','utf8');
const index=fs.readFileSync('index.html','utf8');
class Element{
 constructor(tag){
  this.tag=tag;this.id='';this.className='';this.dataset={};this.children=[];this.events={};
  this.textContent='';this.attrs={};this.isConnected=true;this.type='';this.hidden=false;
 }
 get firstElementChild(){return this.children[0]||null}
 setAttribute(k,v){this.attrs[k]=v}
 append(...items){items.forEach(item=>{item.parent=this;this.children.push(item)})}
 appendChild(item){this.append(item)}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(x=>x!==this)}this.isConnected=false}
 addEventListener(name,handler){this.events[name]=handler}
 querySelectorAll(){return []}
}
const map=new Map(),timeouts=new Map(),intervals=[];let serial=0;
const storage=new Map(),events={};
const body=new Element('body');
const document={
 body,readyState:'complete',hidden:false,
 getElementById:id=>map.get(id)||null,
 createElement:tag=>new Element(tag),
 querySelector:()=>null,
 addEventListener:(event,callback)=>{events[event]=callback}
};
const window={
 matchMedia:()=>({matches:true}),
 addEventListener:()=>{}
};
const ctx={
 document,window,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
 setTimeout:(fn,ms)=>{const id=++serial;timeouts.set(id,{fn,ms});return id},
 clearTimeout:id=>timeouts.delete(id),
 setInterval:(fn,ms)=>{intervals.push({fn,ms});return intervals.length},
 Date,Intl
};
vm.runInNewContext(js,ctx);
const api=window.AIONotifications;
assert.ok(api,'Public notification settings are available to onboarding');
assert.equal(body.children.length,1);
const root=body.children[0];map.set('aioNotices',root);
assert.equal(root.dataset.position,'bottom-right');
assert.equal(api.notify('Test','A new game'),true);
assert.equal(root.children.length,1);
assert.equal(root.children[0].dataset.theme,'glass');
const c=root.children[0];
assert.equal(c.children[1].children[0].textContent,'Test');
assert.equal(c.children[1].children[1].textContent,'A new game');
c.children[2].events.click();
assert.equal(root.children.length,0,'Close button dismisses card');
api.setSettings({theme:'ocean',position:'bottom-left',hometime:false,greetings:false});
assert.equal(root.dataset.position,'bottom-left');
api.notify('Ocean','Blue waves');
assert.equal(root.children[0].dataset.theme,'ocean');
assert.ok(storage.get('aio-notification-settings-v1').includes('ocean'));
api.setSettings({enabled:false});
assert.equal(api.notify('Muted','Not shown'),false,'User disabling alerts must work');
assert.equal(api.preview(),true,'Explicit previews work even when alerts are disabled');
api.setSettings({enabled:true,theme:'pumpkins',hometime:true});
assert.equal(api.notify('Seasonal','Pumpkins'),true);
assert.equal(root.children[root.children.length-1].dataset.theme,'pumpkins');
for(let i=0;i<7;i++)api.notify('Notice '+i,'Stack');
assert.ok(root.children.length<=4,'Notification stacking is capped');
root.children=[]; // Isolate UK time checks.
const uk=api.londonNow(new Date('2026-11-16T14:50:00Z'));
assert.equal(uk.minutes,890);
assert.equal(uk.weekday,'Mon');
api.timeCheck(new Date('2026-11-16T14:50:00Z'));
assert.equal(root.children.length,1);
assert.match(root.children[0].children[1].children[0].textContent,/Nearly hometime/);
api.timeCheck(new Date('2026-11-16T14:51:00Z'));
assert.equal(root.children.length,1,'Daily notice should fire only once');
api.timeCheck(new Date('2026-11-16T15:30:00Z'));
assert.equal(root.children.length,2);
api.timeCheck(new Date('2026-11-14T14:50:00Z'));
assert.equal(root.children.length,2,'No weekend hometime alerts');
api.setSettings({hometime:false});
api.timeCheck(new Date('2026-11-17T14:50:00Z'));
assert.equal(root.children.length,2,'Disabling hometime alerts works');
api.setSettings({hometime:true});
api.timeCheck(new Date('2026-11-18T15:00:00Z'));
assert.equal(root.children.length,3,'30-minute hometime alert is available');
assert.match(root.children[2].children[1].children[1].textContent,/30 minutes/);
assert.equal(api.notify('Duplicate regression','Only one'),true);
assert.equal(api.notify('Duplicate regression','Only one'),false);
assert.ok(api.getHistory().length<=40,'History is bounded');
const paused=root.children[root.children.length-1];
paused.events.pointerenter();paused.events.pointerleave();
assert.ok(api.getHistory().some(n=>n.title==='Duplicate regression'));
document.hidden=true;assert.equal(api.notify('Background','History only'),true);document.hidden=false;
assert.ok(api.getHistory().some(n=>n.title==='Background'));
api.setSettings({enabled:false});assert.equal(root.children.length,0,'Disabling notices removes visible cards');
assert.equal(api.londonNow(new Date('2026-07-01T14:00:00Z')).minutes,900,'UK daylight saving time is respected');
assert.match(css,/@keyframes aioNoticeFloat/);
assert.match(css,/translate3d\(0,46px,0\)/,'Notices rise up from the bottom');
for(const t of ['ocean','pumpkins','midnight'])assert.ok(css.includes('data-theme="'+t+'"'));
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(setup,/aioSetupNoticePreview/);
assert.match(setup,/aioSetupNoticeTheme/);
assert.match(setup,/aioSetupNoticeHometime/);
for(const w of ['deepsea','pumpkin','starlight'])assert.ok(appearance.includes("id:'"+w+"'"));
assert.match(index,/href="\.\/aio-notifications\.css"/);
console.log('Floating notifications pass: UK time, 40m/15:30 dedupe, preference persistence, floating themes, reduced motion, accessibility and setup integration.');

