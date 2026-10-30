'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const appearance = read('appearance.js');
const ux = read('ultimate-experience.js');
const css = read('ultimate-experience.css');
const html = read('index.html');
const social = read('social.html');
const anime = read('anime.html');
const study = read('study.html');
const glassCss = read('appearance.css');
const economy = read('supabase/migrations/20261028093212_aio_coin_quests_pricing_security.sql');
const rewardRules = read('supabase/migrations/20261028094634_aio_game_reward_rules.sql');
const counter = read('supabase/migrations/20261028102739_secure_tiktok_sticker_download_counter.sql');
const eventPolicy = read('supabase/migrations/20261028103352_deny_client_access_to_tiktok_sticker_download_events.sql');
const eventIndex = read('supabase/migrations/20261028103427_index_tiktok_sticker_download_events_sticker_id.sql');
const staffRls = read('supabase/migrations/20261028103528_optimize_tiktok_sticker_staff_rls_policies.sql');

// Appearance choices must change the real UI and persist, not just update previews.
assert.match(appearance, /function selectWallpaper\(id\)[\s\S]*?state\.wallpaper=id;delete state\.pendingWallpaper;save\(\);applyWallpaper\(\)/);
assert.match(appearance, /fs\.addEventListener\('change',[\s\S]*?state\.font=fs\.value;save\(\);applyFont\(\)/);
assert.match(appearance, /aioHeadingFontToggle/);
assert.match(appearance, /aioCursorStyleSelect/);
assert.match(css, /html\.aio-wallpaper-hidden::before\{opacity:0!important\}/);
assert.match(css, /html\[data-aio-theme="glass"\]/);
assert.match(glassCss, /aio-glass-modal-in/);
assert.match(glassCss, /prefers-reduced-motion/);
assert.match(glassCss, /source-label.*display:none!important/s);
for (const gameName of ['Reel League', 'Rescue the Fish', 'Fish Eat Fish', 'Count Control Legends']) {
  assert.ok(html.includes('"name":"' + gameName + '"'), 'Missing Pizza Edition addition: ' + gameName);
}
assert.match(css, /data-aio-font="cherry"/);
assert.match(css, /data-aio-cursor-style="minimal"/);
assert.match(css, /data-aio-cursor-style="chatgpt"/);
assert.match(css, /\.aio-wallpaper-gallery/);
assert.match(css, /\.aio-wallpaper-preview/);
assert.match(css, /\.aio-font-preview/);

// Context actions should report errors; freeze must block input and game switching should close sessions.
assert.match(ux, /Menu action failed:/);
assert.match(ux, /f\.blur\(\)/);
assert.match(ux, /f\.style\.pointerEvents=frozen\?'none':''/);
assert.match(ux, /await endSession\(\);orig\(i\)/);
assert.match(ux, /window\.open\('about:blank','_blank'\)/);
assert.match(ux, /openContext\(p\.x,p\.y\)/);
assert.match(ux, /e\.key==='ContextMenu'/);
assert.match(ux, /aio-wallpaper-hidden/);

// Auth restoration, profile provisioning and media upload cleanup are wired in the existing page.
assert.match(html, /persistSession:true/);
assert.match(html, /auth\.onAuthStateChange/);
assert.match(html, /async function ensureProfile\(\)/);
assert.match(html, /storage\.from\('social-media'\)\.upload/);
assert.match(html, /file&&isVideoFile&&file\.size>100\*1024\*1024/);
assert.match(html, /storage\.from\('social-media'\)\.remove\(\[uploadedStoragePath\]\)/);
assert.match(html, /__aioSocialPostBusy/);

// Database-side controls, not browser-supplied reward amounts, govern the economy.
assert.match(economy, /auth\.uid\(\)/);
assert.match(economy, /for update/i);
assert.match(rewardRules, /aio_game_reward_rules/);
assert.match(counter, /primary key \(user_id, sticker_id, day_key\)/i);
assert.match(counter, /revoke all on function public\.increment_tiktok_sticker_downloads\(uuid\) from public, anon, authenticated/i);
assert.match(counter, /grant execute on function public\.increment_tiktok_sticker_downloads\(uuid\) to authenticated/i);
assert.match(eventPolicy, /for all to anon, authenticated[\s\S]*using \(false\)[\s\S]*with check \(false\)/i);
assert.match(eventIndex, /create index if not exists tiktok_sticker_download_events_sticker_id_idx/i);
assert.match(staffRls, /sr\.user_id = \(select auth\.uid\(\)\)/i);


const arcade = read('games/originals.html');
const arcade2 = read('games/arcade-pack-2.html');
const arcade3 = read('games/arcade-pack-3.html');

// Original mini-games must be real self-contained game modes, not placeholder cards.
for (const mode of ['snake','memory','reaction','breakout','ttt','pong','mines','slide','simon','word']) {
  assert.match(html, new RegExp('games/originals\\.html\\?game=' + mode));
  assert.match(arcade, new RegExp('function ' + ({snake:'snake',memory:'memory',reaction:'reaction',breakout:'breakout',ttt:'ttt',pong:'pong',mines:'mines',slide:'slide',simon:'simon',word:'word'})[mode] + '\\('));
}
assert.match(arcade, /addEventListener\('keydown'/);
assert.match(arcade, /pointermove/);
assert.match(arcade, /aria-live="polite"/);

// The second original pack must expose ten unique, wired game modes.
for (const mode of ['maze','math','color','typing','mole','target','merge','lights','connect','sequence']) {
  assert.ok(html.includes('games/arcade-pack-2.html?game=' + mode), 'Missing registry entry for ' + mode);
  assert.ok(arcade2.includes('function ' + mode + '('), 'Missing implementation for ' + mode);
}
assert.match(arcade2, /aria-live="polite"/);

// The third original pack registers exactly 100 unique additional game entries.
const registryStart = html.indexOf('const GAMES=') + 'const GAMES='.length;
const registryEnd = html.indexOf(';const EXTRA_', registryStart);
assert.ok(registryStart >= 'const GAMES='.length && registryEnd > registryStart, 'Game registry boundaries must exist');
const registeredGames = JSON.parse(html.slice(registryStart, registryEnd));
const pack3 = registeredGames.filter(g => String(g.url || '').startsWith('games/arcade-pack-3.html?game='));
assert.equal(pack3.length, 100, 'Third pack should add exactly 100 registry entries');
assert.equal(new Set(pack3.map(g => g.url)).size, 100, 'Third pack URLs must be unique');
assert.equal(new Set(pack3.map(g => g.name.trim().toLowerCase())).size, 100, 'Third pack titles must be unique');
const mashukuiPack = registeredGames.filter(g => g.source === 'Mashukui Web Games');
assert.equal(mashukuiPack.length, 22, 'Open-source pack should add 22 unique games');
assert.equal(new Set(mashukuiPack.map(g => g.url)).size, 22, 'Open-source game URLs must be unique');
assert.equal(new Set(mashukuiPack.map(g => g.name.trim().toLowerCase())).size, 22, 'Open-source game titles must be unique');
assert.ok(html.includes('function toggleFavourite('));
assert.match(html, /favourite-toggle/);
assert.match(html, /Favourites/);
assert.ok(social.includes("event.key==='ArrowDown'"));
assert.ok(social.includes("event.key==='ArrowUp'"));
assert.ok(social.includes('id="feedSearch"'));
assert.ok(social.includes('id="feedSort"'));
assert.ok(social.includes('function renderCreatorSuggestions()'));
assert.ok(social.includes('data-action="edit-post"'));
assert.ok(social.includes('data-action="delete-post"'));
assert.ok(social.includes('async function editOwnPost('));
assert.ok(social.includes('async function deleteOwnPost('));
assert.ok(social.includes('creator-suggestions-card'));
assert.ok(social.indexOf('id="creatorSuggestions"') < social.indexOf('</aside>'), 'Creator suggestions should stay in the visible sidebar');
assert.ok(social.includes('height:calc(100dvh - 210px)'), 'Feed height should account for the new search toolbar');
assert.ok(social.includes("from('social_posts').delete()"));
assert.ok(social.includes("from('social_posts').update({caption}"));
for (const mode of ['reaction','math','pairs','sequence','scramble','typing','color','odd','order','aim','lights','maze','timing','wordpick','count','pattern','keyreflex','ttt','connect','merge']) {
  assert.ok(arcade3.includes('function ' + mode + '('), 'Missing game engine: ' + mode);
}
assert.match(arcade2, /addEventListener\('keydown'/);

const cardRenderer = html.match(/function cardHTML\(g,i\)\{[\s\S]*?\n\}/)?.[0] || '';
const returnStart = cardRenderer.indexOf('return `');
const returnEnd = returnStart >= 0 ? cardRenderer.indexOf('`;', returnStart) : -1;
const cardMarkup = returnStart >= 0 && returnEnd >= 0 ? cardRenderer.slice(returnStart, returnEnd + 2) : '';
assert.ok(cardMarkup, 'Game card renderer should return consistent markup');
assert.doesNotMatch(cardMarkup, /source\s*:|source\s*\}|powered by/i, 'Provider labels must not appear on ordinary game cards');
assert.match(html, /function filteredGames\(\)/);


 // New pages and player behaviour must stay wired, keyboard-accessible and responsive.
 assert.ok(html.includes("location.href='anime.html'"), 'Anime Zone must be reachable from the main hub');
 assert.ok(html.includes('id="aioQuickLaunch"'), 'Quick Launch dialog must exist');
 assert.ok(html.includes("event.key.toLowerCase()==='k'"), 'Quick Launch Ctrl/Cmd+K shortcut must be wired');
 assert.ok(html.includes("{label:'Anime Zone'"), 'Anime Zone must be registered in Quick Launch');
 assert.ok(!social.includes('class="custom-video-controls"'), 'Visible custom video strip should stay removed');
 assert.ok(!social.includes('class="video-play-overlay"'), 'Floating video play overlay should stay removed');
 assert.ok(social.includes('const togglePlayback=()=>'), 'Social videos must toggle from the video surface');
 assert.ok(social.includes("stage.addEventListener('click'"), 'Social video surface must have click playback');
 for (const animeId of ['pokemon','quint','dressup','demon','haikyu','drstone','spyfamily','frieren','myhero','bluelock']) {
   assert.ok(anime.includes("id:'"+animeId+"'"), 'Missing Anime Zone series: '+animeId);
 }
 assert.equal((anime.match(/banner:'https:\/\//g)||[]).length,10,'Each Anime Zone title should have banner art');
 assert.ok(anime.includes("videoId:'z3hMX65Khtg'"),'Official Pokémon episode embed should stay available');
 assert.ok(anime.includes("videoId:'IJ6gOKkgXX4'"),'Official Quintuplets episode embed should stay available');
 assert.ok(anime.includes('youtube-nocookie.com/embed/'),'In-site playback should use privacy-enhanced official YouTube embeds');
 assert.ok(anime.includes('Open on YouTube'),'An official YouTube fallback link should stay available');
 assert.ok(anime.includes('image.onerror=()=>{image.hidden=true}'),'Spotlight banner should have a broken-image fallback');
 assert.ok(anime.includes('counts=[102,37,41,52,65,40,52,54,47,52,52,55,34,48,49,45,49,49,49,44,62,54,48,42,58,11]'), 'Pokémon season episode catalogue is incomplete');
 assert.ok(anime.includes("const STORE='aio.anime.watch.v1'"), 'Anime watch progress must have a stable local key');
 assert.ok(anime.includes('exportProgress'), 'Anime progress export must stay available');
 assert.ok(anime.includes('demonslayer-anime.com'), 'Demon Slayer official series source must be linked');
 assert.ok(study.includes('id="timerStart"'), 'Study Hub focus timer must stay available');
 assert.ok(study.includes('id="taskForm"'), 'Study Hub revision planner must stay available');
 assert.ok(study.includes('id="flashForm"'), 'Study Hub flashcards must stay available');

console.log('Frontend contract checks passed: appearance persistence, context menu/game freeze wiring, auth/video safeguards, and economy/security migration contracts.');
