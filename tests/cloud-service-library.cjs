'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('cloud-service-library.js','utf8');
const css=fs.readFileSync('cloud-service-library.css','utf8');
const parent=fs.readFileSync('cloud-gaming.js','utf8');
class Element{
 constructor(tag){
  this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};
  this.textContent='';this.value='';this.hidden=false;
 }
 append(...items){this.children.push(...items)}
 appendChild(item){this.children.push(item);return item}
 after(item){this.afterNode=item}
 setAttribute(name,value){this.attrs[name]=value}
 addEventListener(event,fn){this.listeners[event]=fn}
}
const grid=new Element('div'),root=new Element('section');
root.querySelector=query=>query==='.aio-cloud-grid'?grid:null;
const storage=new Map(),elements=[];
const context={
 document:{getElementById:id=>id==='cloud-gaming'?root:null,createElement:tag=>{const el=new Element(tag);elements.push(el);return el}},
 localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
 console
};
context.window=context;
vm.runInNewContext(code,context);
const section=grid.afterNode;
assert.equal(section.id,'aioCloudLibrary','Provider library is mounted in the existing Cloud Gaming section');
assert.equal(elements.filter(x=>x.tag==='iframe').length,0,'Library never tries to embed incompatible providers');
const [top,controls,cards,empty]=section.children;
const filters=controls.children[0],search=controls.children[1];
assert.equal(cards.children.length,3);
assert.match(top.children[1].textContent,/3 cloud options/);
for(const card of cards.children){
 const link=card.children[2].children[0];
 assert.equal(link.target,'_blank');
 assert.equal(link.rel,'noopener noreferrer');
 assert.match(link.href,/^https:\/\//);
}
assert.equal(cards.children[0].children[2].children[0].href,'https://play.geforcenow.com/');
assert.equal(cards.children[1].children[2].children[0].href,'https://www.xbox.com/en-GB/play');
assert.equal(cards.children[2].children[2].children[0].href,'https://luna.amazon.com/');
function changeFilter(id){filters.listeners.click({target:{closest:q=>q==='[data-cloud-filter]'?{dataset:{cloudFilter:id}}:null}})}
changeFilter('free');
assert.equal(cards.children[0].hidden,false);
assert.equal(cards.children[1].hidden,false);
assert.equal(cards.children[2].hidden,true);
changeFilter('membership');
assert.equal(cards.children[0].hidden,true);
assert.equal(cards.children[2].hidden,false);
changeFilter('all');
search.value='amazon';
search.listeners.input();
assert.equal(cards.children[0].hidden,true);
assert.equal(cards.children[2].hidden,false);
search.value='x';
search.listeners.input();
assert.equal(cards.children[1].hidden,false);
search.value='nonsense_value';
search.listeners.input();
assert.equal(empty.hidden,false);
search.value='';
search.listeners.input();
function clickFavourite(id){
 cards.listeners.click({target:{closest:q=>q==='[data-favourite]'?{dataset:{favourite:id}}:null}});
}
clickFavourite('geforce');
assert.match(storage.get('aio-cloud-service-favourites-v1'),/geforce/);
assert.equal(cards.children[0].children[0].children[2].attrs['aria-pressed'],'true');
changeFilter('favourites');
assert.equal(cards.children[0].hidden,false);
assert.equal(cards.children[1].hidden,true);
clickFavourite('geforce');
assert.equal(empty.hidden,false);
assert.equal(context.aioCloudLibrary.filter('evil'),false);
assert.equal(context.aioCloudLibrary.filter('all'),true);
assert.match(parent,/cloud-service-library\.js/);
assert.match(css,/max-width:590px/,'Search and catalog should work on phones');
assert.doesNotMatch(code,/window\.open|iframe|document\.cookie|fetch\(/,'Service finder must not open hidden sessions or collect credentials');
console.log('Cloud provider library passed: official external routes, filters, search, favourites, empty state, no auto streams and responsive layout.');
