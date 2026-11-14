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
assert.ok(html.includes('if(!force){')&&html.includes('if(elapsed<MIN_VISIBLE_MS)'),'Normal splash still animates for 7.5 seconds');
assert.ok(html.includes('if(reduced){finish(true);return;}'),'Reduced-motion skips splash animation');
assert.ok(html.includes('if(!completed)finish(true)'), 'Emergency recovery should force dismissal');
assert.ok(html.includes("if(frame.getAttribute('src')==='about:blank'"), 'Ignore about:blank frame loads');
assert.ok(html.includes("Game frame opened · Check player"), 'Do not label third-party iframe onload as confirmed gameplay');
assert.ok(html.includes('650-(performance.now()-gameLoadStartedAt)'), 'Show a perceptible in-game loading phase');
assert.ok(html.includes('gamepad; pointer-lock;'), '3D games can request pointer lock and gamepad input');
console.log('Real game catalogue and loading regression checks passed.');
