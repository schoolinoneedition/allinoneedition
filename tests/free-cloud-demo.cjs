'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('free-cloud-demo.js','utf8');
const css=fs.readFileSync('free-cloud-demo.css','utf8');
class Element{
 constructor(tag){
  this.tagName=tag;this.children=[];this.listeners={};this.attrs={};this.dataset={};
  this.hidden=false;this.disabled=false;this.textContent='';this.src='';
  if(tag==='iframe')this.contentWindow={mock:true};
 }
 append(...els){this.children.push(...els)}
 appendChild(el){this.children.push(el);return el}
 before(node){this.beforeNode=node}
 replaceChildren(...els){this.children=[...els]}
 setAttribute(key,value){this.attrs[key]=value}
 addEventListener(key,fn){this.listeners[key]=fn}
 remove(){this.removed=true}
 scrollIntoView(){this.scrolled=true}
 focus(){this.focused=true}
}
const root=new Element('section'),grid=new Element('div');
root.querySelector=selector=>selector==='.aio-cloud-grid'?grid:null;
const created=[],listeners={},timers=new Map();let seq=0;
const ctx={
 document:{
  getElementById:id=>id==='cloud-gaming'?root:null,
  createElement:tag=>{const e=new Element(tag);created.push(e);return e}
 },
 window:{
  matchMedia:()=>({matches:false}),
  addEventListener:(event,handler)=>{listeners[event]=handler}
 },
 URL,
 setTimeout:(fn,ms)=>{const id=++seq;timers.set(id,{fn,ms});return id},
 clearTimeout:id=>timers.delete(id)
};
vm.runInNewContext(js,ctx);
const panel=grid.beforeNode;
assert.ok(panel,'Cloud demo is mounted before provider cards');
assert.equal(panel.id,'aioFreeCloudDemo');
assert.equal(created.filter(x=>x.tagName==='iframe').length,0,'No GPU starts on page load');
const head=panel.children[0],status=head.children[1],buttons=panel.children[1],viewer=panel.children[2];
assert.equal(ctx.window.aioFreeCloudDemo.allowlisted('fortnite'),false);
assert.equal(ctx.window.aioFreeCloudDemo.allowlisted('roblox'),false);
assert.equal(ctx.window.aioFreeCloudDemo.start('javascript:alert(1)'),false);
assert.equal(ctx.window.aioFreeCloudDemo.start('chop'),true);
assert.equal(viewer.hidden,false,'Clicking an allowlisted game opens in-page viewer');
const stage=viewer.children[1],frame=stage.children[0],wait=stage.children[1];
assert.equal(frame.tagName,'iframe');
assert.equal(frame.src,'https://stream.eagle3dstreaming.com/v5/demo/E3DS_ChopChop_v6/Project_E3DS_ChopChop_v6');
assert.equal(frame.attrs.sandbox,'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups');
assert.ok(frame.allow.includes('gamepad'));
assert.equal(status.dataset.state,'connecting');
assert.equal(wait.hidden,false);
frame.listeners.load();
assert.equal(wait.hidden,true,'Stop standalone animation when the provider page has loaded');
assert.equal(status.dataset.state,'page_open','Do not falsely claim iframe load confirms a running game');
const receive=listeners.message;
receive({source:{},origin:'https://stream.eagle3dstreaming.com',data:{type:'stage5_playBtnPressed'}});
assert.equal(status.dataset.state,'page_open','Messages from a different frame are ignored');
receive({source:frame.contentWindow,origin:'https://evil.example',data:{type:'stage5_playBtnPressed'}});
assert.equal(status.dataset.state,'page_open','Messages from a hostile origin are ignored');
receive({source:frame.contentWindow,origin:'https://stream.eagle3dstreaming.com',data:{type:'stage1_inqueued',positionInQueue:4}});
assert.equal(status.dataset.state,'queued');
assert.match(status.textContent,/Position 4/);
receive({source:frame.contentWindow,origin:'https://stream.eagle3dstreaming.com',data:JSON.stringify({type:'stage4_playBtnShowedUp'})});
assert.equal(status.dataset.state,'ready');
receive({source:frame.contentWindow,origin:'https://stream.eagle3dstreaming.com',data:{type:'stage5_playBtnPressed'}});
assert.equal(status.dataset.state,'playing');
receive({source:frame.contentWindow,origin:'https://stream.eagle3dstreaming.com',data:{type:'sessionExpired'}});
assert.equal(status.dataset.state,'ended');
const timeout=[...timers.values()].find(x=>x.ms===600000);
assert.ok(timeout,'A short demo limit prevents indefinite public-demo sessions');
timeout.fn();
assert.equal(viewer.hidden,true);
assert.equal(ctx.window.aioFreeCloudDemo.active(),'');
assert.equal(status.dataset.state,'limit');
assert.ok(frame.removed);
assert.equal(ctx.window.aioFreeCloudDemo.start('world'),true,'Offer second public GPU demo');
const fallback=stage.children[0];
assert.equal(fallback.src,'https://connector.eagle3dstreaming.com/v5/demo/DemoAppTP/default');
const stop=viewer.children[0].children[1].children[1];
stop.listeners.click();
assert.equal(viewer.hidden,true);
assert.equal(timers.size,0,'Stop must cancel all timers');
assert.match(css,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(js,/window\.open|document\.cookie|fetch\(|localStorage/i);
console.log('Free GPU streaming demos passed: explicit start, source/origin-checked queue stages, in-site stream, stop, 10-minute cap and no fake Fortnite/Roblox player.');
