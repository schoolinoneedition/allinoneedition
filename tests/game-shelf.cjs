'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const code = fs.readFileSync('aio-game-shelf.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('aio-game-shelf.css', 'utf8');
for (const id of ['aioGameShelf','aioShelfSavedList','aioShelfRecentList','aioShelfCount','aioShelfStatus','aioShelfShareLink','aioShelfShowAll','aioPickerSave','aioPickerShare']) {
  assert.ok(html.includes('id="' + id + '"'), 'Expected Game Shelf node ' + id);
}
assert.match(html, /src="\/aio-game-shelf\.js"/);
assert.match(html, /href="\/aio-game-shelf\.css"/);
assert.match(html, /class="queue-toggle"/);
assert.match(html, /toggleFromCard\(event,\$\{i\}\)/);
assert.match(css, /@media\(max-width:460px\)/);
assert.match(css, /prefers-reduced-motion/);

class Element {
  constructor(tag = 'div') {
    this.tag = tag;
    this.children = [];
    this.listeners = {};
    this.dataset = {};
    this.attributes = {};
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.hidden = false;
    this.type = '';
    this.className = '';
    this.title = '';
  }
  addEventListener(event, cb) { this.listeners[event] = cb; }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  click() { this.listeners.click?.(); }
  focus() { this.focused = true; }
  select() { this.selected = true; }
}
const ids = ['aioGameShelf','aioShelfSavedList','aioShelfRecentList','aioShelfCount','aioShelfStatus','aioShelfShareLink','aioShelfShowAll','aioPickerSave','aioPickerShare'];
const nodes = new Map(ids.map(id => [id, new Element()]));
const cards = [new Element('button'),new Element('button')];
cards[0].dataset.gameIndex = '0';
cards[1].dataset.gameIndex = '1';
const games = [
  {name:'Same Name',cat:'Puzzle',url:'games/originals.html?game=puzzle'},
  {name:'Same Name',cat:'Racing',url:'https://games.example/racer'},
  {name:'Slender Multiplayer',cat:'Multiplayer',url:'https://games.example/scary'},
  {name:'Bad JS',cat:'Arcade',url:'javascript:alert(1)'}
];
const storage = new Map();
const copied = [];
const launched = [];
const context = {
  URL,
  GAMES:games,
  gameProgress:{},
  gameKey:g => g.url,
  openGame:i => launched.push(i),
  location:{href:'https://allinoneedition.vercel.app/',origin:'https://allinoneedition.vercel.app',search:''},
  navigator:{clipboard:{writeText:async text => {copied.push(text);}}},
  document:{
    getElementById:id => nodes.get(id) || null,
    createElement:tag => new Element(tag),
    querySelectorAll:() => cards
  },
  window:{
    aioGamePicker:{selected:() => games[0]},
    localStorage:{
      getItem:key => storage.get(key) || null,
      setItem:(key,value) => {storage.set(key,value);}
    }
  }
};
vm.runInNewContext(code, context);
const api = context.window.aioGameShelf;
assert.ok(api, 'Game Shelf should initialise');
assert.equal(nodes.get('aioShelfCount').textContent,'0 saved');
assert.equal(nodes.get('aioPickerSave').disabled,false);
assert.equal(nodes.get('aioPickerShare').disabled,false);

nodes.get('aioPickerSave').click();
assert.equal(api.has(games[0]),true);
assert.equal(nodes.get('aioShelfCount').textContent,'1 saved');
assert.equal(nodes.get('aioPickerSave').getAttribute('aria-pressed'),'true');
assert.equal(cards[0].getAttribute('aria-pressed'),'true');
assert.equal(cards[0].textContent,'✓');
assert.equal(JSON.parse(storage.get('aio-game-shelf-v1'))[0],games[0].url);

let prevented=false,stopped=false;
api.toggleFromCard({preventDefault(){prevented=true},stopPropagation(){stopped=true}},1);
assert.ok(prevented&&stopped, 'Bookmarking a card must not open it');
assert.equal(api.has(games[1]),true);
assert.equal(nodes.get('aioShelfCount').textContent,'2 saved');
assert.equal(api.toggle(games[2]),false,'A restricted game must not be queueable');
assert.equal(api.toggle(games[3]),false,'Script URL must not be queueable');

const link=api.directLink(games[1]);
const url=new URL(link);
assert.equal(url.pathname,'/');
assert.equal(url.searchParams.get('play'),'Same Name');
assert.equal(url.searchParams.get('gameRef'),games[1].url,'Shared link disambiguates same-named games');
(async () => {
  assert.equal(await api.share(games[1]),true);
  assert.equal(copied.at(-1),link);
  assert.match(nodes.get('aioShelfStatus').textContent,/copied/);
  assert.equal(nodes.get('aioShelfSavedList').children.length,2);
  const playButton = nodes.get('aioShelfSavedList').children[0].children[1].children[0];
  playButton.click();
  assert.equal(launched.at(-1),1,'Saved row should launch the matching index');

  context.gameProgress[games[0].url]={plays:1,lastPlayed:10};
  context.gameProgress[games[1].url]={plays:3,lastPlayed:20};
  api.sync();
  const recent=nodes.get('aioShelfRecentList').children;
  assert.equal(recent.length,2);
  assert.equal(recent[0].children[0].children[0].textContent,'Same Name');

  const tag=html.indexOf('let aioSharedGameOpened=false;');
  const end=html.indexOf('safeBoot(()=>window.aioOpenSharedGame());',tag);
  assert.ok(tag>0 && end>tag);
  const snippet=html.slice(tag,end);
  const opened=[];
  const ctx={window:{},URLSearchParams,GAMES:games,location:{search:url.search},openGame:i=>opened.push(i)};
  vm.runInNewContext(snippet,ctx);
  assert.equal(ctx.window.aioOpenSharedGame(),true);
  assert.equal(opened[0],1,'Deep link opens the exact URL when two games share a name');
  ctx.window.aioOpenSharedGame();
  assert.equal(opened.length,1,'Shared link must not reopen twice');
  assert.ok(html.includes('window.aioOpenSharedGame?.();'),'Late catalogue load should retry pending shared links');

  // Deleting a queued game uses only the saved URL; it never deletes the catalogue.
  api.toggle(games[1]);
  assert.equal(api.has(games[1]),false);
  assert.equal(games.length,4);
  assert.equal(nodes.get('aioShelfCount').textContent,'1 saved');

  // If Clipboard access is unavailable, expose a selectable URL rather than pretending success.
  context.navigator.clipboard=null;
  assert.equal(await api.share(games[0]),false);
  assert.equal(nodes.get('aioShelfShareLink').hidden,false);
  assert.equal(nodes.get('aioShelfShareLink').value,api.directLink(games[0]));
  console.log('Game Shelf passed: bookmarks, recent games, exact duplicate-title deep links, launch, bad URL exclusions, storage and clipboard fallback.');
})().catch(error=>{console.error(error);process.exitCode=1});
