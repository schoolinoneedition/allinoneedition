'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('in-site-play.js','utf8');
const style=fs.readFileSync('in-site-play.css','utf8');
class Classes{
 constructor(){this.values=new Set()}
 add(v){this.values.add(v)}
 remove(v){this.values.delete(v)}
 toggle(v,on){if(on)this.values.add(v);else this.values.delete(v)}
 contains(v){return this.values.has(v)}
}
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.classList=new Classes();this.listeners={};this.hidden=false;this.textContent='';this.src='';this.attributes={};this.style={};}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,cb){this.listeners[k]=cb}
 append(...nodes){this.children.push(...nodes)}
 appendChild(el){this.children.push(el)}
 replaceChildren(...nodes){this.children=[...nodes]}
 querySelectorAll(query){return query==='[data-aio-game]'?this.children.filter(el=>el.dataset.aioGame):[]}
 before(el){this.insertedBefore=el}
 remove(){this.removed=true}
 scrollIntoView(){this.scrolled=true}
}
const root=new Element('section'),grid=new Element('div');
root.querySelector=selector=>selector==='.aio-cloud-grid'?grid:null;
const local=new Map(),events={},timers=new Map();let timerId=0;
const ctx={
 document:{getElementById:id=>id==='cloud-gaming'?root:null,createElement:tag=>new Element(tag)},
 localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},
 clearTimeout(id){timers.delete(id)},
 setTimeout(callback){const id=++timerId;timers.set(id,callback);return id}
};
ctx.window={matchMedia:()=>({matches:false}),addEventListener:(name,cb)=>events[name]=cb};
vm.runInNewContext(source,ctx);
assert.ok(grid.insertedBefore,'in-site play section should mount before provider cards');
assert.equal(grid.insertedBefore.id,'aio-in-site-play');
assert.equal(ctx.window.aioInSitePlay.isAllowed('golf'),true);
assert.equal(ctx.window.aioInSitePlay.isAllowed('fortnite'),false,'Do not misrepresent Fortnite as an embedded game');
assert.equal(ctx.window.aioInSitePlay.isAllowed('roblox'),false,'Do not misrepresent Roblox as an embedded game');
assert.equal(ctx.window.aioInSitePlay.isAllowed('javascript:alert(1)'),false);
assert.equal(ctx.window.aioInSitePlay.open('fortnite'),false);
assert.equal(ctx.window.aioInSitePlay.open('meteor'),true);
const section=grid.insertedBefore;
const player=section.children[2],viewport=player.children[1],status=player.children[2],picks=section.children[1],loading=player.children[3];
assert.equal(player.hidden,false,'The player must become visible');
assert.equal(loading.hidden,false,'Loading animation should show while a game opens');
assert.equal(viewport.children.length,1);
assert.equal(viewport.children[0].src,'/games/arcade-collection.html?game=meteor','Only first-party URL allowed');
assert.equal(local.get('aio-in-site-last-game-v1'),'meteor');
assert.equal(picks.children[0].classList.contains('active'),true);
viewport.children[0].listeners.load();
assert.match(status.textContent,/player opened/);
assert.equal(loading.hidden,true,'Loading animation should clear when first-party game loads');
assert.equal(ctx.window.aioInSitePlay.open('blocks'),true);
assert.equal(viewport.children[0].src,'/games/arcade-collection.html?game=blocks');
assert.equal(loading.hidden,false);
for(const cb of [...timers.values()])cb();
assert.equal(loading.hidden,true,'Timed-out game loading must stop animating');
assert.match(status.textContent,/Still opening/);
ctx.window.aioInSitePlay.close();
assert.equal(player.hidden,true);
assert.equal(loading.hidden,true,'Closing game must dismiss loading state');
assert.equal(viewport.children.length,0);
assert.equal(ctx.window.aioInSitePlay.gameUrl('../evil'),null);
assert.doesNotMatch(source,/window\.open|target=['"]_blank|www\.xbox\.com|easyfun\.gg/i);
assert.match(style,/prefers-reduced-motion:reduce/);
console.log('In-site play passed: no redirects, allowlisted real local games, controls, close, and no fake Fortnite/Roblox embed.');
