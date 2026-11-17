'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('anime.html','utf8');
for(const id of ['spotlightSave','watchMyListFilter','watchNextEpisode','watchNextStatus','importProgress','importProgressFile']){
 assert.ok(html.includes('id="'+id+'"'),'Watch control missing: '+id);
}
assert.match(html,/data-watch-filter="my-list"/);
assert.match(html,/matchesWatchFilter\(s\)/);
assert.match(html,/JSON\.stringify\(\{exportedAt:new Date\(\)\.toISOString\(\),watched,myList:\[\.\.\.watchMyList\]\}/);
assert.match(html,/known\.has\(epKey\)/,'Restores must reject unknown keys.');
assert.match(html,/file\.size>1024\*1024/,'Backups should have a bounded size.');
const start=html.indexOf("const WATCH_MY_LIST='aio.anime.my-list.v1';"),end=html.indexOf(' function renderStats(){',start);
assert.ok(start>0&&end>start);
const source=html.slice(start,end);
const elements=new Map(['spotlightSave','watchMyListFilter','watchNextEpisode','watchNextStatus','saveStatus','episodeSearch','progressFilter','playerTitle'].map(id=>[id,{textContent:'',value:'',disabled:false,attributes:{},setAttribute(k,v){this.attributes[k]=v},scrollIntoView(){this.scrolled=true}}]));
const anime={id:'pokemon',title:'Pokémon',kind:'anime',seasons:[
 {name:'First season',episodes:[{number:1,title:'One'},{number:2,title:'Two'}]},
 {name:'Second season',episodes:[{number:1,title:'Three'}]}
]};
const cartoon={id:'bluey',title:'Bluey',kind:'cartoon',seasons:[{name:'Season 1',episodes:[{number:1,title:'A'}]}]};
const storage=new Map([['aio.anime.my-list.v1',JSON.stringify(['pokemon','unknown'])]]);
const selections=[];
const ctx={
 series:[anime,cartoon],watched:{'pokemon:0:1':true},activeId:'pokemon',activeSeason:0,activeWatchFilter:'all',
 episodeLinks:new Map([['pokemon:0:2',{provider:'B2 Storage'}]]),
 $:id=>elements.get(id),key:(sid,season,ep)=>sid+':'+season+':'+ep,watchLinkKey:(sid,season,ep)=>sid+':'+season+':'+ep,
 current:()=>anime,renderSeries:()=>{ctx.renders=(ctx.renders||0)+1},
 renderCatalog:()=>{ctx.catalogs=(ctx.catalogs||0)+1},renderPlayer:(...args)=>selections.push(args),
 matchMedia:()=>({matches:true}),
 localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
 Set,JSON
};
vm.createContext(ctx);
vm.runInContext(source,ctx);
assert.equal(ctx.matchesWatchFilter(anime),true);
assert.equal(ctx.nextUnwatchedEpisode(anime).episode.number,2);
ctx.refreshWatchActions();
assert.match(elements.get('watchNextEpisode').textContent,/EP 2/);
assert.match(elements.get('watchNextStatus').textContent,/Hosted video available/);
assert.equal(elements.get('spotlightSave').attributes['aria-pressed'],'true');
assert.equal(elements.get('watchMyListFilter').textContent,'My List (1)');
ctx.goToNextUnwatched();
assert.equal(ctx.activeSeason,0);
assert.equal(selections.length,1);
assert.equal(selections[0][2].title,'Two');
assert.equal(elements.get('playerTitle').scrolled,true);

ctx.activeWatchFilter='my-list';
assert.equal(ctx.matchesWatchFilter(anime),true);
assert.equal(ctx.matchesWatchFilter(cartoon),false);
ctx.toggleWatchMyList();
assert.equal(ctx.matchesWatchFilter(anime),false);
assert.equal(JSON.parse(storage.get('aio.anime.my-list.v1')).length,0);
ctx.toggleWatchMyList();
assert.equal(ctx.matchesWatchFilter(anime),true);

ctx.watched['pokemon:0:2']=true;
assert.equal(ctx.nextUnwatchedEpisode(anime).seasonIndex,1);
ctx.goToNextUnwatched();
assert.equal(ctx.activeSeason,1);
assert.equal(selections.at(-1)[2].title,'Three');
ctx.watched['pokemon:1:1']=true;
ctx.refreshWatchActions();
assert.equal(elements.get('watchNextEpisode').disabled,true);
console.log('Watch usability passed: My List persistence/filter, next-unwatched across seasons, hosted-video hint, complete state and backup/import contracts.');
