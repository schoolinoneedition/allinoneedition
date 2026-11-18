'use strict';
/*
 * Export a portable, unmonetized Circuit Snake HTML5 demo for independent
 * game-portal review. Does not modify the live AIO games, insert advertising,
 * or publish on external sites.
 *
 * Usage: node scripts/build-circuit-snake-portal.cjs
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'dist','circuit-snake-portal');
const originalHtml=fs.readFileSync(path.join(root,'games','bonus-arcade.html'),'utf8');
const originalJs=fs.readFileSync(path.join(root,'games','bonus-arcade.js'),'utf8');
function replaceOnce(input,from,to,label){
  assert.equal(input.split(from).length-1,1,'Expected one '+label+' in original game source');
  return input.replace(from,to);
}
let html=originalHtml;
html=replaceOnce(html,'<title>AIO Arcade · Bonus Games</title>','<title>Circuit Snake · Original HTML5 Arcade Game</title>','HTML title');
html=replaceOnce(html,'<meta name="description" content="Play original arcade challenges including Circuit Snake, Merge Matrix, Orbit Dash and Colour Catch.">','<meta name="description" content="Play Circuit Snake, a self-contained original HTML5 snake arcade game with keyboard and touch controls.">','HTML description');
html=replaceOnce(html,'<main aria-label="All in One Edition bonus arcade">','<main aria-label="Circuit Snake game">','main label');
html=replaceOnce(html,'<h1 id="title">AIO Bonus Arcade</h1><p id="subtitle">Four original games, playable right here</p>','<h1 id="title">Circuit Snake</h1><p id="subtitle">Collect nodes and avoid your own trail</p>','game heading');
html=replaceOnce(html,'<script src="/games/bonus-arcade.js" defer></script>','<script src="./game.js" defer></script>','portable game script');
let js=originalJs;
js=replaceOnce(js,"const requested=new URLSearchParams(location.search).get('game');\n const mode=Object.hasOwn(MODES,requested)?requested:'snake';","// Standalone export is permanently locked to the original Circuit Snake mode.\n const mode='snake';",'game mode routing');
assert.doesNotMatch(html,/<script[^>]+src=["']https?:\/\//i,'No external scripts can be bundled');
assert.doesNotMatch(html,/pagead2\.googlesyndication\.com|adsbygoogle|BLOB_READ_WRITE_TOKEN/,'Do not embed AdSense or private credentials in portal builds');
assert.doesNotMatch(js,/https?:\/\/|fetch\s*\(|XMLHttpRequest|document\.cookie|eval\s*\(/,'Keep portable build self-contained');
fs.mkdirSync(target,{recursive:true});
fs.writeFileSync(path.join(target,'index.html'),html,'utf8');
fs.writeFileSync(path.join(target,'game.js'),js,'utf8');
fs.writeFileSync(path.join(target,'README.txt'),[
  'CIRCUIT SNAKE - Independent HTML5 game review build',
  '',
  'Open index.html in a modern browser. Both index.html and game.js must stay',
  'in the same directory. No network, account, storage credentials, or server',
  'is required. Your browser may remember a personal best locally.',
  '',
  'Controls: arrow keys, WASD, on-screen buttons, or swipe. Space/P to pause.',
  '',
  'IMPORTANT: This is a technical review build, NOT an approved ad build.',
  'The live AIO website keeps its separate AdSense integration unchanged.',
  'CrazyGames and other portals require their own review, SDK integration and',
  'actual authorization before monetization. Do not add independent AdSense',
  'tags inside a portal-hosted game. Do not submit any third-party games or',
  'unlicensed artwork. An eligible parent/guardian must manage publisher',
  'contracts, age/identity verification and payout details when required.',
  ''
].join('\n'),'utf8');
console.log('Circuit Snake standalone review build created at dist/circuit-snake-portal');
