'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const js=fs.readFileSync('game-motion.js','utf8'),css=fs.readFileSync('game-motion.css','utf8');
class Classes{
 constructor(){this.values=new Set()}
 add(...names){names.forEach(name=>this.values.add(name))}
 remove(...names){names.forEach(name=>this.values.delete(name))}
 contains(name){return this.values.has(name)}
 toggle(name,on){if(on)this.add(name);else this.remove(name)}
}
class Element{
 constructor(tag='div'){this.tagName=tag;this.classList=new Classes();this.style={display:'none',setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}};this.children=[];this.attrs={};this.dataset={};this.textContent='';}
 appendChild(el){this.children.push(el);return el}
 append(...els){els.forEach(el=>this.appendChild(el))}
 replaceChildren(...els){this.children=[...els]}
 setAttribute(key,value){this.attrs[key]=value}
 querySelectorAll(){return[]}
}
const a=new Element('article'),b=new Element('article'),grid=new Element('div');
grid.cards=[a,b];grid.querySelectorAll=()=>grid.cards;grid.contains=el=>grid.cards.includes(el);
const loader=new Element('div'),modal=new Element('div');
const links=[],events={},instances=[],intersections=[],timers=new Map();
const root={classList:new Classes(),dataset:{}};
const doc={documentElement:root,head:{appendChild:el=>links.push(el)},getElementById(id){
 return ({gameGrid:grid,gameLoading:loader,gameModal:modal})[id]||null;
},createElement:tag=>new Element(tag)};
let timer=0;
class Observer{
 constructor(callback){this.callback=callback;instances.push(this);this.targets=[]}
 observe(el){this.targets.push(el)}
 disconnect(){}
 trigger(){this.callback([])}
}
class Intersection{
 constructor(callback){this.callback=callback;intersections.push(this);this.targets=[]}
 observe(el){this.targets.push(el)}
 unobserve(el){this.targets=this.targets.filter(x=>x!==el)}
 disconnect(){this.targets=[]}
 show(el,visible){this.callback([{target:el,isIntersecting:visible}])}
}
const context={document:doc,window:{scrollY:0,matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(name,cb)=>events[name]=cb},MutationObserver:Observer,IntersectionObserver:Intersection,requestAnimationFrame:cb=>cb(),setTimeout:cb=>{const id=++timer;timers.set(id,cb);return id},clearTimeout:id=>timers.delete(id)};
context.window.IntersectionObserver=Intersection;
vm.runInNewContext(js,context);
assert.equal(links.length,1);
assert.equal(links[0].href,'/game-motion.css');
assert.equal(intersections[0].targets.length,2);
assert.ok(a.classList.contains('aio-reveal-card'));
intersections[0].show(a,true);assert.ok(a.classList.contains('aio-in-view'));
context.window.scrollY=100;events.scroll();assert.equal(root.dataset.aioScrollDirection,'down');
context.window.scrollY=20;events.scroll();assert.equal(root.dataset.aioScrollDirection,'up');
modal.classList.add('open');loader.style.display='grid';
instances.find(x=>x.targets.includes(modal)).trigger();
assert.ok(loader.classList.contains('aio-game-loader'));
assert.equal(loader.attrs.role,'status');
assert.equal(loader.children.length,1);
assert.equal(timers.size,2);
loader.style.display='none';instances.find(x=>x.targets.includes(loader)).trigger();
assert.equal(timers.size,0,'closing the game should cancel loading-message timers');
assert.ok(!js.includes('siteLoader')&&!css.includes('#siteLoader'),'Retired startup splash references must not return');
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(css,/data-aio-performance-profile="lite"/);
assert.match(css,/data-aio-scroll-direction="up"/);
assert.doesNotMatch(js,/\.innerHTML\s*=/,'Loader uses DOM elements instead of injected game markup');
console.log('Game motion passed: cards reveal and move with scroll, in-game loader toggles, timers clean up and retired splash remains absent.');
