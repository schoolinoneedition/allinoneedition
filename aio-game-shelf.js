/* All in One Edition Game Shelf: saved queue, recent games, exact share links. */
(() => {
  'use strict';
  const root = document.getElementById('aioGameShelf');
  if (!root) return;

  const get = id => document.getElementById(id);
  const list = get('aioShelfSavedList');
  const recentList = get('aioShelfRecentList');
  const count = get('aioShelfCount');
  const status = get('aioShelfStatus');
  const shareFallback = get('aioShelfShareLink');
  const showMore = get('aioShelfShowAll');
  const pickerSave = get('aioPickerSave');
  const pickerShare = get('aioPickerShare');
  if (!list || !recentList || !count || !status || !shareFallback || !showMore || !pickerSave || !pickerShare) return;

  const KEY = 'aio-game-shelf-v1';
  const MAX = 24;
  const DANGER = /\b(horror|slender|haunted|scary|creepy|gore|bloodbath|zombie|jumpscare|nightmare|terror)\b/i;
  let expanded = false;

  function catalogue() {
    try { return typeof GAMES !== 'undefined' && Array.isArray(GAMES) ? GAMES : []; }
    catch { return []; }
  }
  function validGame(game) {
    if (!game || typeof game.url !== 'string' || typeof game.name !== 'string') return false;
    if (!game.url || !game.name || DANGER.test([game.name, game.cat, ...(Array.isArray(game.tags) ? game.tags : [])].join(' '))) return false;
    try { return /^https?:$/.test(new URL(game.url, location.href).protocol); } catch { return false; }
  }
  function readSaved() {
    try {
      const data = JSON.parse(window.localStorage.getItem(KEY) || '[]');
      return Array.isArray(data) ? [...new Set(data.filter(s => typeof s === 'string' && s.length <= 2200))].slice(0, MAX) : [];
    } catch { return []; }
  }
  let saved = readSaved();
  function persist() {
    try { window.localStorage.setItem(KEY, JSON.stringify(saved)); return true; }
    catch { return false; }
  }
  function note(message) {
    status.textContent = message;
  }
  function has(game) {
    return !!game?.url && saved.includes(game.url);
  }
  function selectedPick() {
    return window.aioGamePicker?.selected?.() || null;
  }
  function updateButton(button, game, label) {
    if (!button) return;
    const usable = validGame(game);
    const already = usable && has(game);
    button.disabled = !usable;
    button.setAttribute('aria-pressed', String(!!already));
    button.textContent = already ? 'Saved for later ✓' : label;
  }
  function toggle(game) {
    if (!validGame(game)) { note('This game is not available to save.'); return false; }
    if (has(game)) {
      saved = saved.filter(key => key !== game.url);
      note('Removed ' + game.name + ' from your queue.');
    } else {
      if (saved.length >= MAX) { note('The queue is full. Remove a game before adding another.'); return false; }
      saved.unshift(game.url);
      note('Saved ' + game.name + ' for later.');
    }
    if (!persist()) note('Browser storage is unavailable. These changes may not survive a refresh.');
    sync();
    return has(game);
  }
  function toggleFromCard(event, index) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const game = catalogue()[index];
    if (game) toggle(game);
  }
  function updateCardButtons() {
    for (const button of document.querySelectorAll('.queue-toggle[data-game-index]')) {
      const game = catalogue()[Number(button.dataset.gameIndex)];
      const valid = validGame(game);
      const on = valid && has(game);
      button.disabled = !valid;
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', (on ? 'Remove ' : 'Save ') + (game?.name || 'game') + (on ? ' from your queue' : ' for later'));
      button.title = on ? 'Remove from Game Shelf' : 'Save for later';
      button.textContent = on ? '✓' : '+';
    }
  }
  function directLink(game) {
    if (!validGame(game)) return null;
    const link = new URL('/', location.origin);
    link.searchParams.set('play', game.name);
    link.searchParams.set('gameRef', game.url);
    return link.toString();
  }
  async function share(game) {
    const link = directLink(game);
    if (!link) return false;
    shareFallback.hidden = true;
    try {
      if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(link);
      note('Game link copied for ' + game.name + '.');
      return true;
    } catch {
      shareFallback.value = link;
      shareFallback.hidden = false;
      shareFallback.focus();
      shareFallback.select();
      note('Copy the game link from the box below.');
      return false;
    }
  }
  function play(game) {
    const index = catalogue().indexOf(game);
    if (index < 0 || typeof openGame !== 'function') {
      note('This game is not in the current catalogue.');
      return false;
    }
    openGame(index);
    sync();
    return true;
  }
  function makeButton(label, callback, aria) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn mini';
    button.textContent = label;
    if (aria) button.setAttribute('aria-label', aria);
    button.addEventListener('click', callback);
    return button;
  }
  function makeRow(game, queued) {
    const row = document.createElement('div');
    row.className = 'aio-shelf-row';
    const details = document.createElement('div');
    details.className = 'aio-shelf-game';
    const title = document.createElement('strong');
    title.textContent = game.name;
    const sub = document.createElement('span');
    sub.textContent = game.cat || 'Browser game';
    details.append(title, sub);
    const actions = document.createElement('div');
    actions.className = 'aio-shelf-actions';
    actions.append(makeButton('Play', () => play(game), 'Play ' + game.name));
    if (queued) actions.append(makeButton('Remove', () => toggle(game), 'Remove ' + game.name + ' from queue'));
    else actions.append(makeButton('Save', () => toggle(game), 'Save ' + game.name + ' for later'));
    actions.append(makeButton('Copy link', () => { void share(game); }, 'Copy game link for ' + game.name));
    row.append(details, actions);
    return row;
  }
  function recentGames() {
    try {
      if (typeof gameProgress === 'undefined' || typeof gameKey !== 'function') return [];
      return catalogue().filter(validGame).map(game => ({ game, time: Number(gameProgress[gameKey(game)]?.lastPlayed) || 0 }))
        .filter(item => item.time > 0)
        .sort((a, b) => b.time - a.time)
        .slice(0, 3).map(item => item.game);
    } catch { return []; }
  }
  function render() {
    const byUrl = new Map(catalogue().filter(validGame).map(game => [game.url, game]));
    const existing = saved.map(url => byUrl.get(url)).filter(Boolean);
    count.textContent = existing.length + ' saved';
    list.replaceChildren();
    if (!existing.length) {
      const empty = document.createElement('p');
      empty.textContent = saved.length ? 'Your saved games will appear when their catalogue loads.' : 'Your queue is empty. Save a Game Mixer pick or tap + on any game card.';
      list.append(empty);
    } else {
      for (const game of (expanded ? existing : existing.slice(0, 5))) list.append(makeRow(game, true));
    }
    showMore.hidden = existing.length <= 5;
    showMore.textContent = expanded ? 'Show fewer' : 'Show all (' + existing.length + ')';
    recentList.replaceChildren();
    const recent = recentGames();
    if (!recent.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Games you open will appear here.';
      recentList.append(empty);
    } else {
      for (const game of recent) recentList.append(makeRow(game, false));
    }
  }
  function sync() {
    updateButton(pickerSave, selectedPick(), 'Save for later');
    pickerShare.disabled = !validGame(selectedPick());
    updateCardButtons();
    render();
  }

  pickerSave.addEventListener('click', () => toggle(selectedPick()));
  pickerShare.addEventListener('click', () => { void share(selectedPick()); });
  showMore.addEventListener('click', () => { expanded = !expanded; render(); });
  window.aioGameShelf = Object.freeze({ toggle, toggleFromCard, has, sync, share, directLink, saved: () => saved.slice() });
  sync();
})();