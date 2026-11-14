'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('const GAMES=')+'const GAMES='.length,end=html.indexOf(';const EXTRA_',start);
assert.ok(start>12&&end>start,'Game registry stays loadable');
const games=JSON.parse(html.slice(start,end));
const urls=new Set(games.map(game=>game.url));
assert.equal(urls.size,games.length,'No duplicate URLs in the main registry');
assert.ok(games.length>=976,'Preserve all 884 existing registry entries and imported games');
const github=games.filter(game=>game.source==='sausi-7 Games (MIT)');
assert.equal(github.length,92,'Import exactly 92 curated public browser-game entries');
const labels=new Set(),allowed=new Set(['Arcade','Puzzle','Sports','Board','Casual','Racing','Platformer','Simulation','Word']);
const disallow=/\b(gun|guns|weapon|weapons|knife|knives|firearm|rifle|sniper|pistol|shotgun|grenade|bomb|ammo|sword|blade|shooting|shooter|war|violence|kill|horror|zombie|gore|gambling|casino|betting|lottery)\b/i;
for(const g of github){
 assert.ok(allowed.has(g.cat),g.name+' must have a suitable category');
 assert.match(g.url,/^https:\/\/sausi-7\.github\.io\/games\/games\/(?:puzzle|arcade|racing|sports|platformer|casual|board|word-quiz|3d)\/[a-z0-9-]+\/index\.html$/,'Only official static game paths');
 assert.ok(g.name&&g.desc&&g.credit.includes('MIT licensed'),'Keep original attribution and metadata');
 assert.ok(!disallow.test(g.name+' '+g.desc),'No unsuitable additions: '+g.name);
 const name=g.name.toLowerCase().replace(/[^a-z0-9]+/g,'');
 assert.ok(!labels.has(name),'No title duplicates inside imported pack: '+g.name);
 labels.add(name);
}
const oldSources=games.reduce((o,g)=>(o[g.source]=(o[g.source]||0)+1,o),{});
assert.ok(oldSources['Pizza Edition']>=313,'Retain Pizza Edition collection');
assert.ok(oldSources['TopVaz']>=64,'Retain TopVaz collection');
assert.ok(games.some(g=>g.name==='Polytrack'&&g.source==='Pizza Edition'));
assert.ok(games.some(g=>g.name==='Drift Hunters'&&g.source==='TopVaz'));
const goal=5000,remaining=Math.max(0,goal-games.length);
console.log('Game import checks pass. Raw registry '+games.length+' entries; '+github.length+' MIT-licensed Github additions, Pizza '+oldSources['Pizza Edition']+', TopVaz '+oldSources['TopVaz']+'. Long-term 5,000 goal requires '+remaining+' additional distinct, legitimate entries (before runtime filtering).');
