'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('const GAMES=')+'const GAMES='.length;
const end=html.indexOf(';const EXTRA_',start);
assert.ok(start>15&&end>start,'Game registry boundaries intact');
const games=JSON.parse(html.slice(start,end));
const selected=[
 {name:'APEX Racing',url:'https://kenkenling.github.io/apex-racing/'},
 {name:'React Three Racing',url:'https://racing.pmnd.rs/'}
];
for(const expected of selected){
 const entry=games.find(g=>g.name===expected.name);
 assert.ok(entry,expected.name+' should be catalogued');
 assert.equal(entry.url,expected.url);
 assert.equal(entry.cat,'Racing');
 assert.ok(entry.credit&&entry.credit.length>12,'Creator credits must be kept in the player');
}
assert.equal(new Set(games.map(g=>g.url)).size,games.length,'No duplicate game URLs');



assert.ok(!html.includes('id="siteLoader"')&&!html.includes('MIN_VISIBLE_MS=7500'),'No forced startup loading screen');
assert.ok(html.includes('safeBoot(renderGames);'),'Draw game cards during startup without a fake wait');
assert.ok(html.includes('id="gameLoading"'),'Keep genuine game loading state');
assert.ok(html.includes("if(frame.getAttribute('src')==='about:blank'"), 'Ignore about:blank frame loads');
assert.ok(html.includes("Game frame opened � Check player"), 'Do not label third-party iframe onload as confirmed gameplay');
assert.ok(!html.includes('650-(performance.now()-gameLoadStartedAt)'), 'Reveal frames immediately without an artificial minimum delay');
assert.ok(html.includes('gamepad; pointer-lock;'), '3D games can request pointer lock and gamepad input');
console.log('Real game catalogue and immediate startup / honest game-load regression checks passed.');

