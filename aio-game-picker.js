/* Game Mixer: a lightweight catalogue picker. No AI calls, external data or autoplay. */
(() => {
  'use strict';
  const root = document.getElementById('aioGamePicker');
  if (!root) return;

  const title = document.getElementById('aioPickerTitle');
  const description = document.getElementById('aioPickerDescription');
  const meta = document.getElementById('aioPickerMeta');
  const play = document.getElementById('aioPickerPlay');
  const next = document.getElementById('aioPickerNext');
  const modeButtons = [...root.querySelectorAll('[data-aio-picker-mode]')];
  if (!title || !description || !meta || !play || !next || !modeButtons.length) return;

  const HISTORY_KEY = 'aio-game-picker-history-v1';
  const MODES = ['quick', 'puzzle', 'racing', 'together', 'anything'];
  const riskyName = /\b(horror|slender|haunted|scary|creepy|gore|bloodbath|zombie|jumpscare|nightmare|terror)\b/i;
  let currentMode = 'quick';
  let selected = null;

  function keyOf(game) {
    return String(game.url || '');
  }
  function loadHistory() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string').slice(0, 16) : [];
    } catch {
      return [];
    }
  }
  let recent = loadHistory();

  function saveHistory() {
    try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(recent)); } catch { /* Private mode */ }
  }

  function catalogue() {
    try { return typeof GAMES !== 'undefined' && Array.isArray(GAMES) ? GAMES : []; }
    catch { return []; }
  }
  function played(game) {
    try {
      if (typeof gameProgress === 'undefined') return false;
      const key = typeof gameKey === 'function' ? gameKey(game) : keyOf(game);
      return !!gameProgress[key]?.plays;
    } catch {
      return false;
    }
  }
  function usable(game) {
    if (!game || typeof game.name !== 'string' || typeof game.url !== 'string') return false;
    if (!game.name.trim() || !game.url.trim()) return false;
    const terms = [game.name, game.cat, ...(Array.isArray(game.tags) ? game.tags : [])].join(' ');
    if (riskyName.test(terms) || /^horror$/i.test(String(game.cat || ''))) return false;
    try {
      if (!/^https?:$/.test(new URL(game.url, location.href).protocol)) return false;
    } catch {
      return false;
    }
    try {
      if (typeof safeMode !== 'undefined' && safeMode && ['Horror', 'Adventure'].includes(game.cat)) return false;
    } catch {}
    return true;
  }
  function matches(game, mode) {
    const category = String(game.cat || '').toLowerCase();
    const tags = Array.isArray(game.tags) ? game.tags.map(t => String(t).toLowerCase()) : [];
    switch (mode) {
      case 'quick': {
        const url = new URL(game.url, location.href);
        return url.origin === location.origin && /^\/games\/[^?#]+\.html$/i.test(url.pathname);
      }
      case 'puzzle':
        return ['puzzle', 'board', 'memory', 'word', 'educational'].includes(category)
          || tags.some(t => /^(puzzle|logic|math|memory|brain|word)$/.test(t));
      case 'racing':
        return /racing|driving/.test(category) || tags.some(t => /^(racing|driving|cars?)$/.test(t));
      case 'together':
        return ['multiplayer', '2 player', 'io'].includes(category)
          || tags.some(t => /^(multiplayer|co-op|2-player|friends)$/.test(t));
      case 'anything':
        return true;
      default:
        return false;
    }
  }

  function pick(requestedMode = currentMode) {
    currentMode = MODES.includes(requestedMode) ? requestedMode : 'quick';
    modeButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.aioPickerMode === currentMode));
    });
    const candidates = catalogue().filter(game => usable(game) && matches(game, currentMode));
    if (!candidates.length) {
      selected = null;
      title.textContent = 'No games in this group yet';
      description.textContent = 'Try another type of game or use the full catalogue.';
      meta.textContent = 'No matching catalogue entries';
      play.disabled = true;
      next.disabled = true;
      window.aioGameShelf?.sync();
      return null;
    }

    const notRecent = candidates.filter(game => !recent.includes(keyOf(game)));
    const available = notRecent.length ? notRecent : candidates;
    const unplayed = available.filter(game => !played(game));
    const pool = unplayed.length ? unplayed : available;
    selected = pool[Math.floor(Math.random() * pool.length)];
    const key = keyOf(selected);
    recent = [key, ...recent.filter(item => item !== key)].slice(0, 16);
    saveHistory();

    title.textContent = selected.name;
    description.textContent = String(selected.desc || selected.description || 'Pick this game from the library.').slice(0, 170);
    meta.textContent = (selected.cat || 'Browser game') + (played(selected) ? ' · Previously opened' : ' · New to you');
    play.disabled = false;
    next.disabled = false;
    window.aioGameShelf?.sync();
    return selected;
  }

  for (const button of modeButtons) {
    button.addEventListener('click', () => pick(button.dataset.aioPickerMode));
  }
  next.addEventListener('click', () => pick(currentMode));
  play.addEventListener('click', () => {
    const games = catalogue();
    const index = games.indexOf(selected);
    if (index >= 0 && typeof openGame === 'function') {
      openGame(index);
    } else {
      title.textContent = 'That game is no longer available';
      description.textContent = 'Pick another game to continue.';
      play.disabled = true;
    }
  });

  window.aioGamePicker = Object.freeze({
    pick,
    selected: () => selected,
    mode: () => currentMode
  });
  pick('quick');
})();
