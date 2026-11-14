'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('cloud-gaming.js','utf8');
class Element{
 constructor(tag='div'){this.tagName=tag;this.dataset={};this.children=[];this.listeners={};this.textContent='';this.hidden=false;this.className='';}
 appendChild(child){this.children.push(child);return child}
 append(...items){items.forEach(item=>this.appendChild(item))}
 after(node){this.afterNode=node}
 addEventListener(event,listener){this.listeners[event]=listener}
 querySelector(){return null}
 querySelectorAll(){return []}
 closest(){return null}
}
const fortnite=new Element('article'),roblox=new Element('article'),grid=new Element('div');
const fortniteLink=new Element('a'),robloxLink=new Element('a');
fortniteLink.href='https://www.xbox.com/en-GB/play/games/fortnite/BT5P2X999VH2';
robloxLink.href='https://www.roblox.com/';
const fortniteStatus=new Element('div'),robloxStatus=new Element('div'),robloxSummary=new Element('p');
fortnite.querySelector=selector=>selector==='a'?fortniteLink:selector==='.cloud-status'?fortniteStatus:null;
roblox.querySelector=selector=>selector==='a'?robloxLink:selector==='.cloud-status'?robloxStatus:selector==='p'?robloxSummary:null;
const root=new Element('section');
root.querySelectorAll=selector=>selector==='.aio-cloud-card'?[fortnite,roblox]:[];
root.querySelector=selector=>selector==='.aio-cloud-card.roblox'?roblox:selector==='.aio-cloud-grid'?grid:null;
const ids=new Map([['cloud-gaming',root]]);
for(const id of ['aioCloudConnection','aioCloudController','aioCloudRecent','aioCloudResume','aioCloudPartyShare','aioCloudPartyNote','aioCloudPartyClear']){
 ids.set(id,new Element(id==='aioCloudPartyShare'?'input':'div'));
}
const store=new Map(),shared=[];let cleared=0;
const context={
 document:{getElementById:id=>ids.get(id)||null,createElement:tag=>new Element(tag)},
 navigator:{onLine:true,connection:{effectiveType:'4g'},getGamepads:()=>[{connected:true}]},
 localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
 addEventListener(){},
 console,
};
context.window=context;
context.aioPartyCloudLaunch=id=>{shared.push(id);return true};
context.aioPartyCloudStop=()=>{cleared++};
vm.createContext(context);
vm.runInContext(source,context);
assert.equal(root.dataset.cloudReady,'1');
assert.match(fortniteStatus.textContent,/VERIFIED CLOUD LAUNCH/);
assert.match(robloxStatus.textContent,/THIRD-PARTY CLOUD OPTION/);
assert.ok(roblox.children.some(c=>c.children.some(x=>x.href==='https://www.easyfun.gg/cloud-games/roblox.html')));
assert.equal(robloxLink.href,'https://www.roblox.com/','Keep official fallback');
assert.equal(fortniteLink.rel,'noopener noreferrer','Outbound links must be isolated');
assert.match(ids.get('aioCloudConnection').textContent,/not a streaming speed or latency test/i);
assert.match(ids.get('aioCloudController').textContent,/Controller detected/);
assert.equal(context.aioCloudGaming.allowedGame('unknown'),false);
assert.equal(context.aioCloudGaming.allowedGame('roblox'),true);
ids.get('aioCloudPartyShare').checked=true;
root.listeners.click({target:{closest:()=>({dataset:{cloudGame:'roblox'}})}});
assert.equal(store.get('aio-cloud-last-game-v1'),'roblox');
assert.equal(ids.get('aioCloudResume').href,'https://www.easyfun.gg/cloud-games/roblox.html');
assert.deepEqual(shared,['roblox'],'Cloud launch shares only an opted-in known game');
ids.get('aioCloudPartyShare').checked=false;
ids.get('aioCloudPartyShare').listeners.change({target:{checked:false}});
assert.equal(cleared,1,'Opting out must clear the current party activity');
root.listeners.click({target:{closest:()=>({dataset:{cloudGame:'fortnite'}})}});
assert.deepEqual(shared,['roblox'],'Opting out must stop further game-sharing notifications');
assert.equal(store.get('aio-cloud-last-game-v1'),'fortnite');
assert.doesNotMatch(source,/<iframe|document\.cookie|localStorage\.setItem\([^)]*password/i);
console.log('Cloud gaming launcher passed: verified provider routes, official fallback, device hints, quick resume, and opt-in party status.');
