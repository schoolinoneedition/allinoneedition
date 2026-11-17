'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('aio-game-picker.js', 'utf8');
const page = fs.readFileSync('index.html', 'utf8');
assert.match(page, /id="aioGamePicker"/);
assert.match(page, /src="\/aio-game-picker\.js"/);
assert.match(page, /href="\/aio-game-picker\.css"/);
assert.equal((page.match(/data-aio-picker-mode=/g) || []).length, 5);

class Element {
  constructor(mode) {
    this.dataset = mode ? {aioPickerMode: mode} : {};
    this.attributes = {};
    this.events = {};
    this.textContent = '';
    this.disabled = false;
  }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  addEventListener(key, callback) { this.events[key] = callback; }
  click() { this.events.click?.(); }
}
const modeButtons = ['quick', 'puzzle', 'racing', 'together', 'anything'].map(m => new Element(m));
const elements = new Map([
  ['aioPickerTitle', new Element()],
  ['aioPickerDescription', new Element()],
  ['aioPickerMeta', new Element()],
  ['aioPickerPlay', new Element()],
  ['aioPickerNext', new Element()]
]);
const container = {querySelectorAll: () => modeButtons};
elements.set('aioGamePicker', container);
const storage = new Map();
const launched = [];
const games = [
  {name:'Arcade One',url:'games/arcade-collection.html?game=one',cat:'Arcade',desc:'Fast and local'},
  {name:'Arcade Two',url:'/games/arcade-pack-2.html?game=two',cat:'Arcade',desc:'Another local game'},
  {name:'Brain Blocks',url:'https://games.example/brain',cat:'Puzzle'},
  {name:'Fast Circuit',url:'https://games.example/race',cat:'Racing'},
  {name:'Co-op Arena',url:'https://games.example/arena',cat:'Multiplayer',tags:['friends']},
  {name:'Slender Multiplayer',url:'https://games.example/horror',cat:'Multiplayer'},
  {name:'Unsafe Link',url:'javascript:alert(1)',cat:'Arcade'}
];
const app = {
  document:{
    getElementById:id => elements.get(id) || null
  },
  window:{
    localStorage:{
      getItem:key => storage.get(key) || null,
      setItem:(key,value) => storage.set(key,value)
    }
  },
  location:{origin:'https://allinoneedition.vercel.app',href:'https://allinoneedition.vercel.app/'},
  URL,
  GAMES:games,
  gameProgress:{},
  gameKey:g => g.url,
  safeMode:false,
  openGame:i=>launched.push(i),
  Math,
  console
};
vm.runInNewContext(source,app);
const picker = app.window.aioGamePicker;
assert.ok(picker,'Game Mixer must initialise');
assert.equal(picker.mode(),'quick');
assert.ok(picker.selected().url.includes('/games/') || picker.selected().url.startsWith('games/'));
assert.equal(elements.get('aioPickerPlay').disabled,false);
assert.equal(modeButtons[0].getAttribute('aria-pressed'),'true');

const first = picker.selected().url;
elements.get('aioPickerNext').click();
assert.notEqual(picker.selected().url,first,'Reroll must avoid the most recent available pick');

modeButtons[1].click();
assert.equal(picker.mode(),'puzzle');
assert.equal(picker.selected().name,'Brain Blocks');
assert.equal(modeButtons[1].getAttribute('aria-pressed'),'true');
assert.equal(modeButtons[0].getAttribute('aria-pressed'),'false');
elements.get('aioPickerPlay').click();
assert.equal(launched.at(-1),games.indexOf(picker.selected()),'Play opens the selected catalogue index');

modeButtons[2].click();
assert.equal(picker.selected().name,'Fast Circuit');
modeButtons[3].click();
assert.equal(picker.selected().name,'Co-op Arena','Unsafe horror-labelled game excluded from multiplayer picks');
modeButtons[4].click();
for(let n=0;n<20;n++){
  const game=picker.pick('anything');
  assert.ok(game && !/slender|unsafe/i.test(game.name),'Unsafe or malformed picks excluded');
}
assert.ok(storage.has('aio-game-picker-history-v1'));
assert.ok(JSON.parse(storage.get('aio-game-picker-history-v1')).length<=16);

games.splice(games.findIndex(g=>g.name==='Fast Circuit'),1);
picker.pick('racing');
assert.equal(elements.get('aioPickerPlay').disabled,true,'Empty category disables launching');
assert.match(elements.get('aioPickerTitle').textContent,/No games/);
console.log('Game Mixer passed: quick local picks, filters, no-repeat rerolls, safe URLs, keyboard-friendly buttons, play action and empty state.');
