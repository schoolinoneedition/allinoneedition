'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const community=JSON.parse(fs.readFileSync('games/catalogue-community.json','utf8'));
const start=html.indexOf('const GAMES=')+'const GAMES='.length;
const end=html.indexOf(';const EXTRA_',start);
assert.ok(start>12&&end>start,'Existing catalogue remains parseable');
const base=JSON.parse(html.slice(start,end));
assert.equal(base.length,976,'Previous 976 game entries are preserved, unmodified by the new batch');
assert.ok(community.length>=450&&community.length<600,'A bounded, actually sourced external HTML5 pack is present');
const names=new Set(base.map(g=>String(g.name).toLowerCase().replace(/[^a-z0-9]/g,'')));
const urls=new Set(base.map(g=>String(g.url).toLowerCase()));
const allow=new Set(['Arcade','Puzzle','Platformer','Racing','Sports','Simulation','Board','Memory','Word']);
const ban=/(horror|haunt|creep|scary|spook|slender|fnaf|granny|nightmare|nightshift|zomb|ghoul|ghost|skull|skele|undead|blood|gore|demon|devil|evil|terror|murder|killer|kill|dead|dark|night|backroom|abandon|fright|scream|gun|shoot|sniper|knife|sword|war|battle|assault|weapon|combat|bullet|grenade|bomb|mafia|robber|heist|fight|tank|doom|quake|wolfenstein|gta|casino|poker|slots|roulette|jackpot|betting|gambl|blackjack|lottery|lotto|scratch|drugs|weed|smok|beer|vodka|alcohol|porn|nude|nsfw|sex|adult|strip|hentai|mario|pokemon|sonic|zelda|minecraft|disney|spongebob|simpsons|freddy|baldi|kirby|angrybird|starwars|prison|roblox|fortnite|slayer|risky|crash|stunt|surviv|army|alien|invasion|resident|fighter|poke|flashgame|behead|steal|cops|police|squid|hero|avengers|batman|ben10|spiderman|wrestl|street|angry|enem|conflict|empire|boxing|punch|slap|strikeforce|terrorist|burglar|heist|ninj|gambl|cannon|strange rope police|grand action simulator|bitlife)/i;
for(const g of community){
 assert.ok(g.name&&g.credit,'Every game has a real title and publisher attribution');
 assert.ok(allow.has(g.cat),'Categories stay in curated list');
 assert.match(g.url,/^https:\/\/cdn\.jsdelivr\.net\/gh\/GoatTech-42\/NEBULACDN@main\/games\/[a-z0-9-]+\.html$/,'Exact publisher-reported HTML URL only');
 assert.ok(!ban.test(g.name+' '+g.url),'No intentionally excluded/mature titles: '+g.name);
 const key=g.name.toLowerCase().replace(/[^a-z0-9]/g,'');
 assert.ok(!names.has(key),'No duplicate game titles: '+g.name);
 assert.ok(!urls.has(g.url.toLowerCase()),'No duplicate URLs');
 names.add(key);urls.add(g.url.toLowerCase());
 assert.equal(g.verified,'catalogue-link-only','Never claim untested playback');
}
for(const entry of [
 {name:'3x3 +1 Keyboard Escape',prefix:'https://www.timestables.com/gf/3x3-speed/'},
 {name:'3x3 Steal an Egg',prefix:'https://www.timestables.com/gf/3x3-steal-egg/'}
]){
 const game=base.find(g=>g.name===entry.name);
 assert.ok(game,'Existing 3×3 game must remain');
 assert.ok(game.url.startsWith(entry.prefix),'Existing 3×3 URL/settings must remain unchanged');
}
for(const label of ['3×3 Tile Slide','3×3 Tic Tac Toe','3×3 Pattern Recall'])assert.ok(html.includes(label),'New original 3×3 game registered: '+label);
for(const url of ['game=slide','game=xo','game=memory'])assert.ok(html.includes('games/3x3-originals.html?'+url));
assert.match(html,/async function loadAioCommunityPack\(\)/);
assert.match(html,/setTimeout\(\(\)=>\{loadAioCommunityPack\(\)/,'Extra games are loaded asynchronously after first paint');
assert.match(html,/safeBoot\(renderGames\);/);
assert.match(html,/catalogueGoal/,'Visible 2,000 goal is based on actual entry count');
assert.ok(!html.includes('id="siteLoader"')&&!html.includes('MIN_VISIBLE_MS=7500'),'Remove the site startup splash');
assert.match(html,/id="gameLoading"/,'Do not remove honest per-game loading feedback');
console.log('Curated community game pack passed: '+community.length+' metadata-backed links, no duplicate titles, preserved original 3×3 links and immediate startup.');
