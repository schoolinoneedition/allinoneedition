'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('games/3x3-originals.html','utf8');
const source=fs.readFileSync('games/3x3-originals.js','utf8');
assert.match(html,/src="\/games\/3x3-originals\.js"/);
assert.match(html,/grid-template-columns:repeat\(3/);
assert.match(html,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|document\.cookie|eval\(/);
class E{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.dataset={};this.classList={add:()=>{}};this.attrs={};this.textContent='';this.disabled=false;this.style={}}
 setAttribute(k,v){this.attrs[k]=v}
 addEventListener(k,fn){this.listeners[k]=fn}
 replaceChildren(...children){this.children=children}
 appendChild(child){this.children.push(child)}
}
for(const selected of ['slide','xo','memory']){
 const nodes=new Map(),events={},winEvents={},timeouts=new Map();let timeoutId=0;
 const get=id=>{if(!nodes.has(id))nodes.set(id,new E('div'));return nodes.get(id)};
 const env={
  document:{
   getElementById:get,
   createElement:tag=>new E(tag),
   addEventListener:(name,fn)=>{events[name]=fn},
   hidden:false
  },
  location:{search:'?game='+selected},
  URLSearchParams,
  window:{addEventListener:(name,fn)=>{winEvents[name]=fn}},
  Math,
  setTimeout:(fn,ms)=>{const id=++timeoutId;timeouts.set(id,{fn,ms});return id},
  clearTimeout:id=>timeouts.delete(id)
 };
 vm.runInNewContext(source,env);
 const api=env.window.aioThreeByThree;
 assert.equal(api.mode,selected);
 assert.equal(get('grid').children.length,9,'Every 3x3 puzzle uses exactly nine cells');
 assert.equal(api.adjacent(0,1),true);
 assert.equal(api.adjacent(0,3),true);
 assert.equal(api.adjacent(0,4),false);
 assert.equal(api.solved([1,2,3,4,5,6,7,8,0]),true);
 assert.equal(api.winner(['X','X','X','','','','','','']),'X');
 assert.equal(api.winner(['O','X','','O','X','','O','','']),'O');
 assert.equal(api.winner(['X','O','X','X','O','O','O','X','X']),'draw');
 assert.equal(api.bestMove(['O','O','','X','X','','','','']),2,'Tic-tac-toe computer picks the winning square');
 if(selected==='slide'){
  const values=api.getState().values;
  assert.equal(values.length,9);
  assert.equal(new Set(values).size,9);
  assert.equal(api.solved(values),false,'Slide board is actually scrambled');
  const nums=values.filter(n=>n!==0),inversions=nums.reduce((n,x,i)=>n+nums.slice(i+1).filter(y=>x>y).length,0);
  assert.equal(inversions%2,0,'Slide puzzle scramble remains solvable');
  const gap=values.indexOf(0),neighbor=[...values.keys()].find(i=>api.adjacent(i,gap));
  get('grid').children[neighbor].listeners.click();
  assert.equal(api.getState().moves,1);
  assert.equal(get('score').textContent,'1');
 }
 if(selected==='xo'){
  assert.equal(api.getState().values.filter(Boolean).length,0);
  get('grid').children[0].listeners.click();
  assert.equal(api.getState().values[0],'X');
  assert.equal(api.getState().pending,true);
  const timer=[...timeouts.values()][0];timer.fn();
  assert.equal(api.getState().values.filter(Boolean).length,2);
  assert.equal(api.getState().pending,false);
 }
 if(selected==='memory'){
  assert.equal(api.getState().level,1);
  assert.equal(api.getState().pending,true,'Inputs blocked while sequence is showing');
  env.document.hidden=true;
  events.visibilitychange();
  assert.equal(timeouts.size,0,'Switching away clears sequence timers');
  get('restart').listeners.click();
  assert.equal(api.getState().level,1);
 }
 get('restart').listeners.click();
 assert.equal(get('grid').children.length,9);
 winEvents.pagehide();
}
console.log('3x3 puzzle lab passed: solvable slide, minimax AI, memory lifecycle, keyboard/touch controls and no network dependencies.');
