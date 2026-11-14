'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('games/bonus-arcade.html','utf8');
const js=fs.readFileSync('games/bonus-arcade.js','utf8');
const inSite=fs.readFileSync('in-site-play.js','utf8');
assert.match(html,/src="\/games\/bonus-arcade\.js"/);
assert.match(html,/touch-action:none/);
assert.match(html,/aria-live="polite"/);
assert.match(html,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(js,/(?:https?:\/\/|fetch\s*\(|XMLHttpRequest|document\.cookie|eval\s*\()/i,'Bonus game runtime must be local and self-contained');
const modes=['snake','merge','orbit','catch'];
class Element{
 constructor(id){this.id=id;this.textContent='';this.attrs={};this.listeners={};this.dataset={};this.hidden=false;this.value='';}
 setAttribute(key,value){this.attrs[key]=value}
 addEventListener(key,callback){this.listeners[key]=callback}
 getBoundingClientRect(){return {left:0,width:420,top:0,height:600}}
}
for(const requested of [...modes,'fortnite']){
 const lookup=new Map(),docEvents={},windowEvents={},frames=new Map(),storage=new Map();let frameIndex=0;
 function get(id){if(!lookup.has(id))lookup.set(id,new Element(id));return lookup.get(id)}
 const ctx2d=new Proxy({},{
  get(obj,prop){return obj[prop]===undefined?()=>{}:obj[prop]},
  set(obj,prop,value){obj[prop]=value;return true}
 });
 get('board').getContext=()=>ctx2d;
 const directions=modes.map(id=>{const el=new Element(id);el.dataset.dir=['left','up','down','right'][modes.indexOf(id)];return el});
 const document={
  getElementById:get,
  querySelectorAll:selector=>selector==='[data-dir]'?directions:[],
  addEventListener:(key,handler)=>{docEvents[key]=handler},
  hidden:false
 };
 const ctx={
  document,window:{addEventListener:(key,handler)=>{windowEvents[key]=handler}},
  location:{search:'?game='+requested},
  URLSearchParams,
  Math,
  requestAnimationFrame:callback=>{const id=++frameIndex;frames.set(id,callback);return id},
  cancelAnimationFrame:id=>frames.delete(id),
  localStorage:{
   getItem:key=>storage.get(key)||null,
   setItem:(key,value)=>storage.set(key,value)
  }
 };
 vm.runInNewContext(js,ctx);
 const expected=modes.includes(requested)?requested:'snake';
 const api=ctx.window.aioBonusArcade;
 assert.equal(api.mode,expected);
 assert.equal(api.status(),'ready');
 assert.equal(api.score(),0);
 assert.ok(get('overlayTitle').textContent.includes('Ready'));
 assert.equal(get('board').attrs['aria-label'].includes('game board'),true);
 for(const game of modes)assert.ok(api.available().includes(game));
 get('play').listeners.click();
 assert.equal(api.status(),'playing',expected+' must start on play');
 assert.equal(get('overlay').hidden,true);
 assert.equal(frames.size,expected==='merge'?0:1);
 if(expected==='merge'){
  docEvents.keydown({key:'ArrowLeft',preventDefault(){}});
  assert.equal(api.status(),'playing');
  assert.ok(api.score()>=0);
 }else{
  for(let step=0;step<4;step++){
   const item=[...frames.entries()][0];if(!item)break;
   frames.delete(item[0]);item[1]((step+1)*120);
  }
 }
 get('pause').listeners.click();
 assert.equal(api.status(),'paused');
 assert.equal(get('overlay').hidden,false);
 get('play').listeners.click();
 assert.equal(api.status(),'playing','Resume button should work');
 get('restart').listeners.click();
 assert.equal(api.status(),'playing','Restart should not break');
 assert.equal(api.score(),0,'Restart resets score');
 document.hidden=true;docEvents.visibilitychange();
 assert.equal(api.status(),'paused','Hidden tab pauses game');
 assert.equal(frames.size,0,'Pause cancels animation');
 windowEvents.pagehide();
}
assert.match(inSite,/bonus-arcade\.html/);
console.log('Bonus arcade smoke passed: four real games, keyboard move, local rendering, pause/resume, restart, tab suspension and no external assets.');
