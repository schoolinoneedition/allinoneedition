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
const animeStorage = read('supabase/migrations/20261030125800_anime_episode_storage_manager.sql');
const vercel = read('vercel.json');

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
 assert.ok(!anime.includes('youtube-nocookie.com'),'Anime Zone must not depend on YouTube embeds');
 assert.ok(!anime.includes('videoId:'),'Anime Zone must not contain broken hard-coded video IDs');
 assert.ok(anime.includes('No video added yet'),'Episodes without a saved video must show a clear empty player state');
 assert.ok(anime.includes("ownerClient.from('staff_roles').select('role')"),'Episode editing must verify the signed-in site owner role');
 assert.ok(anime.includes("ownerClient.from('anime_episode_watch_links').upsert"),'The owner must be able to save episode videos to Supabase');
 assert.ok(anime.includes("ownerClient.storage.from('anime-episodes').upload"),'The owner must be able to upload videos to XBT Storage');
 assert.ok(anime.includes("const siteUrl='https://allinoneedition.vercel.app/videos/'"),'Uploaded videos must be saved under the All in One Edition /videos/ route');
 assert.ok(anime.includes('validateSelfHostedVideoUrl'),'Direct video URLs must be validated');
 assert.ok(anime.includes("path.startsWith('/videos/')"),'Direct video URLs must use the dedicated AIO videos path');
 assert.ok(anime.includes('Drop your video file here'),'The owner must have a dedicated video upload drop zone');
 assert.ok(anime.includes('Upload and host on All in One Edition'),'The upload action must publish the video through the hub domain');
 assert.ok(anime.includes("navigator.clipboard.writeText(value)"),'The hosted episode URL must be copyable');
 assert.ok(vercel.includes('"source": "/videos/:series/:season/:filename"'),'Vercel must proxy uploaded video paths');
 assert.ok(vercel.includes('https://btnbuchsrfllpzlypjtn.supabase.co/storage/v1/object/public/anime-episodes/:series/:season/:filename'),'The AIO video route must proxy the Anime Storage bucket');
 assert.ok(vercel.includes('"source": "/videos"')&&vercel.includes('"destination": "/social.html"'),'The existing Videos social page route must remain intact');
 assert.ok(anime.includes('file.size>50*1024*1024'),'Uploads must respect the current 50 MB Free-plan limit');
 assert.ok(anime.includes('video.controls=false'),'The player must hide native volume controls');
 assert.ok(anime.includes("video.addEventListener('click',toggle)"),'Clicking the video must play or pause');
 assert.ok(anime.includes('frame.requestFullscreen()'),'The player must include fullscreen');
 assert.ok(anime.includes('This editor is restricted to the site owner account.'),'Episode editing must stay owner-only');
 assert.ok(!anime.includes('watchLinks')&&!anime.includes('sourceLinks'),'The old external provider and episode-source panels should stay removed');
 assert.ok(animeStorage.includes("create policy \"Site owner can upload anime episodes\""),'Anime videos must have owner-only Storage upload permissions');
 assert.ok(animeStorage.includes("create policy \"Site owner can delete anime episodes\""),'Anime videos must have owner-only Storage delete permissions');
 assert.ok(animeStorage.includes("allinoneedition\\\\.vercel\\\\.app/videos/"),'Database validation must only accept direct videos on the AIO /videos/ route');
 assert.ok(animeStorage.includes("file_size_limit, allowed_mime_types"),'The Anime episode bucket must restrict upload size and media types');
 assert.ok(animeStorage.includes("grant select on table public.anime_episode_watch_links to anon, authenticated"),'The episode video catalogue must be readable by visitors');
 assert.ok(animeStorage.includes("grant insert, update, delete on table public.anime_episode_watch_links to authenticated"),'Only signed-in clients may reach write operations, with owner-only RLS enforcement');

 assert.ok(anime.includes('image.onerror=()=>{image.hidden=true}'),'Spotlight banner should have a broken-image fallback');
 assert.ok(anime.includes('counts=[102,37,41,52,65,40,52,54,47,52,52,55,34,48,49,45,49,49,49,44,62,54,48,42,58,11]'), 'Pokémon season episode catalogue is incomplete');
 assert.ok(anime.includes("const STORE='aio.anime.watch.v1'"), 'Anime watch progress must have a stable local key');
 assert.ok(anime.includes('exportProgress'), 'Anime progress export must stay available');
 assert.ok(anime.includes('demonslayer-anime.com'), 'Demon Slayer official series source must be linked');
 assert.ok(study.includes('id="timerStart"'), 'Study Hub focus timer must stay available');
 assert.ok(study.includes('id="taskForm"'), 'Study Hub revision planner must stay available');
 assert.ok(study.includes('id="flashForm"'), 'Study Hub flashcards must stay available');

// Video feeds should not fetch every MP4 when the page renders.
assert.ok(html.includes('data-video-src=') && html.includes("function socialAttachVideoSource(video,preload='metadata')"), 'Main hub Social videos should attach their sources on demand');
assert.ok(html.includes("video.preload='none'"), 'Main hub videos should not preload the entire feed');
assert.ok(html.includes("socialPreloadNextVideos(){") && html.includes("socialAttachVideoSource(nextVideo,'metadata')"), 'Only the next visible-feed video should have metadata warmed');
assert.ok(!html.includes('autoplay loop preload="auto" data-social-video'), 'Main hub Social videos must not all auto-download on render');
assert.ok(social.includes('videoPreloadObserver') && social.includes("rootMargin:'650px 0px'"), 'Separate Social page should prepare videos shortly before they enter view');
assert.ok(social.includes('function prepareSocialVideo(video)'), 'Separate Social page should attach video URLs only when needed');
assert.ok(social.includes('data-video-src=') && !social.includes('<video src="'+escapeHTML(p.media_url)+'" data-social-video'), 'Separate Social feed should not attach every video source during rendering');
assert.ok(anime.includes("video.dataset.videoSrc=saved.watch_url;video.preload='none'"), 'Anime episodes should not request video bytes merely when selected');
assert.ok(anime.includes("cacheControl:'31536000'"), 'Unique Anime episode uploads should receive long-lived cache headers');
assert.ok(html.includes('href="https://btnbuchsrfllpzlypjtn.supabase.co" crossorigin') && social.includes('href="https://btnbuchsrfllpzlypjtn.supabase.co" crossorigin') && anime.includes('href="https://btnbuchsrfllpzlypjtn.supabase.co" crossorigin'), 'Video pages should preconnect to their storage API');

// Keep one source of truth for favourites and avoid eager-fetching dozens of covers.
assert.ok(!ux.includes('addFavouriteButtons'), 'Discovery must not inject a duplicate favourites button system');
assert.ok(!ux.includes('aio-favourite-button'), 'Each game card should keep only its native favourite control');
assert.ok(ux.includes("discoveryFilter==='favourites'") && ux.includes('favouriteGames.has(gameKey(x.g))'), 'The discovery favourites filter must use the existing saved favourites');
assert.ok(html.includes("const priority=i<12?'eager':'lazy'"), 'Only the first twelve game covers should be eager-loaded');
assert.ok(ux.includes('60000-(Date.now()%60000)'), 'The minute-only clock should align updates to minute boundaries');

console.log('Frontend contract checks passed: appearance persistence, context menu/game freeze wiring, auth/video safeguards, and economy/security migration contracts.');
