/* Original-games daily spotlight: no prizes, bets, rewards or accounts. */
(() => {
  'use strict';
  const title = document.getElementById('aioDailyGameName');
  const link = document.getElementById('aioDailyGameOpen');
  const copy = document.getElementById('aioDailyGameShare');
  const description = document.getElementById('aioDailyGameDesc');
  const status = document.getElementById('aioDailyGameStatus');
  const fallback = document.getElementById('aioDailyGameLink');
  if (!title || !link || !copy || !description || !status || !fallback) return;
  const games = Object.freeze([
    {name:'3×3 Tile Slide',path:'/games/3x3-originals.html?game=slide',desc:'Put the tiles back in order in a quick logic puzzle.'},
    {name:'3×3 Tic Tac Toe',path:'/games/3x3-originals.html?game=xo',desc:'Try to make three in a row against the computer.'},
    {name:'3×3 Pattern Recall',path:'/games/3x3-originals.html?game=memory',desc:'Memorise the glowing 3×3 sequence.'},
    {name:'Circuit Snake',path:'/games/bonus-arcade.html?game=snake',desc:'Collect nodes while steering clear of your tail.'},
    {name:'Merge Matrix',path:'/games/bonus-arcade.html?game=merge',desc:'Combine matching tiles with arrow keys or swipes.'},
    {name:'Orbit Dash',path:'/games/bonus-arcade.html?game=orbit',desc:'Dodge obstacles with left and right controls.'},
    {name:'Colour Catch',path:'/games/bonus-arcade.html?game=catch',desc:'React quickly to catch the right objects.'}
  ]);
  function pick(dateValue) {
    const day = Math.floor(Number(dateValue) / 86400000);
    if (!Number.isFinite(day)) return games[0];
    return games[((day % games.length) + games.length) % games.length];
  }
  const game = pick(Date.now());
  title.textContent = game.name;
  description.textContent = game.desc;
  link.href = game.path;
  link.textContent = 'Play ' + game.name;
  const url = new URL(game.path,location.origin).href;
  copy.addEventListener('click',async () => {
    fallback.hidden = true;
    try {
      if (navigator.share) {
        await navigator.share({title:'Today’s AIO original game: '+game.name,url});
        status.textContent = 'Game shared.';
        return;
      }
      if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copied. Send it to a friend to play the same game.';
    } catch (error) {
      if (error?.name === 'AbortError') return;
      fallback.value = url;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      status.textContent = 'Copy the game link from the box below.';
    }
  });
  window.aioDailyOriginalPick = pick;
})();