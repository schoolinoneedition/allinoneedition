'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const appearance = read('appearance.js');
const ux = read('ultimate-experience.js');
const backend = read('backend-features.js');
const css = read('ultimate-experience.css');
const html = read('index.html');
const social = read('social.html');
const anime = read('anime.html');
const elementor = read('elementor.html');
const elementorWorker = read('cloudflare/elementor-ai/worker.ts');
const elementorSchema = read('supabase/migrations/20261107120000_elementor_workspace.sql');
const elementorAvatarSchema = read('supabase/migrations/20261107121000_elementor_profile_avatar_media.sql');
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

// The party wheel is a no-stakes choice picker with fair selection, sound opt-in, and a spin lock.
assert.match(html, /partyWheelSpinning=false/);
assert.match(html, /crypto\.getRandomValues\(random\)/);
assert.match(html, /partyWheelMuted=true/);
assert.match(html, /id="partyWheelSpin"/);
assert.match(html, /id="partyWheelMute"/);
assert.match(html, /if\(partyWheelSpinning\)return/);
assert.match(html, /role="status" aria-live="polite"/);

 // Finishing touches: remove the unused ad slot and share appearance across standalone pages.
 assert.ok(!html.includes('perchads.com')&&!html.includes('perch-ad-slot')&&!html.includes('perch-ad-section'), 'The unused Perch ad slot and loader must be completely removed.');
 const faviconPng = fs.readFileSync(path.join(__dirname, '..', 'favicon.png'));
 const appleIcon = fs.readFileSync(path.join(__dirname, '..', 'apple-touch-icon.png'));
 const faviconIco = fs.readFileSync(path.join(__dirname, '..', 'favicon.ico'));
 assert.ok(faviconPng.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && faviconPng.readUInt32BE(16) === 1024 && faviconPng.readUInt32BE(20) === 1024, 'The supplied favicon must be an upscaled 1024px PNG.');
 assert.ok(appleIcon.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && appleIcon.readUInt32BE(16) === 180 && faviconIco.subarray(0, 4).equals(Buffer.from([0,0,1,0])), 'Apple touch and ICO favicon variants must be present.');
 assert.ok([html, social, anime, elementor, study].every(page => page.includes('href="/favicon.png"') && page.includes('href="/favicon.ico"') && page.includes('href="/apple-touch-icon.png"')), 'Every main page must use the shared refreshed favicon set.');
 assert.ok([html, social, anime, elementor].every(page => page.includes('src="/favicon.png"')), 'Visible site brand marks must use the new artwork.');
 assert.ok(social.includes('./appearance.css')&&social.includes('./appearance.js')&&anime.includes('./appearance.css')&&anime.includes('./appearance.js')&&elementor.includes('/appearance.css')&&elementor.includes('/appearance.js'), 'Social, Watch and Elementor must load the shared appearance system.');
 assert.ok(appearance.includes("root.dataset.aioWallpaperActive=active?'1':'0'")&&glassCss.includes('data-aio-wallpaper-active="1"'), 'Saved wallpapers must be applied consistently on standalone pages.');
 assert.ok(css.includes('aioOnboardSlideIn')&&css.includes('aio-ultimate-modal.open .aio-onboard-card'), 'Setup should use a smooth slide-in transition.');
 assert.ok(html.includes(`location.href='anime.html'">Watch`)&&anime.includes('<title>Watch · Anime & Cartoons'), 'The main navigation should call the separate anime page Watch.');
 assert.ok(anime.includes("id:'bluey',kind:'cartoon'")&&anime.includes("id:'pocoyo',kind:'cartoon'")&&anime.includes("id:'bing',kind:'cartoon'"), 'Watch should keep anime and include family cartoon collections.');
 assert.ok(anime.includes('youtube-nocookie.com/embed/')&&anime.includes('aP-qKaig84M')&&anime.includes('dDP-jzPV5fo'), 'Family cartoon episodes should use official publisher embeds.');
 assert.ok(anime.includes('uk.bingbunny.com/spis-odcinkow')&&anime.includes('data-watch-filter="cartoons"'), 'Cartoon browsing should include an official Bing episode guide and a dedicated filter.');
 assert.ok(anime.includes("if(s.kind==='cartoon'){selectedEpisode=null;$('ownerLinkPanel').hidden=true;return}"), 'Family cartoon listings must not write into the anime-only episode storage table.');


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

const cardRenderer = html.match(/function cardHTML\(g,i(?:,position=i)?\)\{[\s\S]*?\n\}/)?.[0] || '';
const returnStart = cardRenderer.indexOf('return `');
const returnEnd = returnStart >= 0 ? cardRenderer.indexOf('`;', returnStart) : -1;
const cardMarkup = returnStart >= 0 && returnEnd >= 0 ? cardRenderer.slice(returnStart, returnEnd + 2) : '';
assert.ok(cardMarkup, 'Game card renderer should return consistent markup');
assert.doesNotMatch(cardMarkup, /source\s*:|source\s*\}|powered by/i, 'Provider labels must not appear on ordinary game cards');
assert.match(html, /function filteredGames\(\)/);
assert.ok(!html.includes('aioQuickLaunch')&&!html.includes('quickLaunchOpen')&&!html.includes('Quick Launch'), 'Quick Launch must be completely removed from the hub.');
const codeEditorStart=html.indexOf('<textarea id="codeEditor">');
const codeEditorClose=html.indexOf('</textarea>',codeEditorStart);
const nextLiveSection=html.indexOf('<section class="section">',codeEditorClose);
assert.ok(codeEditorStart>=0&&codeEditorClose>codeEditorStart&&nextLiveSection>codeEditorClose, 'Code Lab textarea must close immediately after its sample so the remaining page stays live HTML.');
assert.match(html, /replace\(\/\\b\(find\|show/);
assert.ok(html.includes('const scoreGame=g=>')&&html.includes('hits.length===terms.length')&&html.includes('list.sort((a,b)=>b.score-a.score'), 'Game search must rank name, category, tag and description matches.');
assert.ok(html.includes('Search games…'), 'The search placeholder must describe the actual game-search scope.');
assert.ok(elementorWorker.includes('if(user&&!allowRate(recentChats,rateKey,24))')&&elementorWorker.includes('if(user&&!allowRate(recentImages,rateKey,3))'), 'Guest AI chat and image generation must not have a usage quota.');
assert.ok(elementor.includes('id="thinkMode"')&&elementor.includes('think:thinkMode'), 'Think mode must select a real backend reasoning configuration.');
assert.ok(elementor.includes('id="stop"')&&elementor.includes('activeController.abort()'), 'Users must be able to stop a live generation.');
assert.ok(elementor.includes("res.body.getReader()")&&elementor.includes("decoder.decode(value"), 'Chat replies must render from the actual backend stream.');
assert.ok(elementor.includes('function regenerateLast()')&&elementor.includes("navigator.clipboard.writeText(sanitizeElementorOutput(m.content||''))"), 'Assistant replies must support regenerate and safe copy.');
assert.ok(elementor.includes('const wantsImage=/')&&elementor.includes('await createImage(text)')&&!elementor.includes("$('imageMode').onclick=")&&!elementor.includes("$('clearMode').onclick="), 'Image intent must work from ordinary chat prompts without a separate mode button.');
assert.ok(elementor.includes('function renderMarkdownText(')&&elementor.includes('document.createElement(ri===0?\'th\':\'td\')'), 'Chat messages must render safe Markdown blocks and tables.');
assert.ok(elementor.includes('highlight.js@11.11.1')&&elementor.includes('window.hljs.highlightElement(node)'), 'Fenced code blocks must use syntax highlighting when the highlighter loads.');
const elementorBodyStart=elementor.indexOf("<body");
const elementorMainScriptStart=elementor.indexOf("<script>",elementor.indexOf("</head>"));
const elementorMarkup=elementor.slice(elementorBodyStart,elementorMainScriptStart);
const elementorStyles=elementor.slice(elementor.indexOf("<style>"),elementor.indexOf("</style>"));
assert.ok(!elementorMarkup.includes('id="themeToggle"')&&!elementorStyles.includes(':root.dark')&&elementor.includes('/appearance.css')&&elementor.includes('/appearance.js'), 'Elementor must share the homepage wallpaper and stay in its clean light theme.');
assert.ok(elementor.includes('async function callAI()')&&elementor.includes('function renderMessages()')&&elementor.includes('<\\/script>'), 'The complete chat script must survive embedded code examples.');
assert.ok(elementorWorker.includes('@cf/zai-org/glm-4.7-flash')&&elementorWorker.includes('stream:true'), 'Worker must use a real reasoning model in Think mode and stream model output.');



 // New pages and player behaviour must stay wired, keyboard-accessible and responsive.
 assert.ok(html.includes("location.href='anime.html'"), 'Anime Zone must be reachable from the main hub');
 assert.ok(!social.includes('class="custom-video-controls"'), 'Visible custom video strip should stay removed');
 assert.ok(!social.includes('class="video-play-overlay"'), 'Floating video play overlay should stay removed');
 assert.ok(social.includes('const togglePlayback=()=>'), 'Social videos must toggle from the video surface');
 assert.ok(social.includes("stage.addEventListener('click'"), 'Social video surface must have click playback');
 for (const animeId of ['pokemon','quint','dressup','demon','haikyu','drstone','spyfamily','frieren','myhero','bluelock']) {
   assert.ok(anime.includes("id:'"+animeId+"'"), 'Missing Anime Zone series: '+animeId);
 }
 assert.ok((anime.match(/banner:'https:\/\//g)||[]).length>=10,'Anime and cartoon collections should retain banner art');
 assert.ok(anime.includes("kind:'cartoon'")&&anime.includes('youtube-nocookie.com/embed/'),'Only explicitly curated family-cartoon entries should use official YouTube embeds; anime playback remains owner-managed.');
 assert.ok(!anime.includes('videoId:'),'Anime Zone must not contain broken hard-coded video IDs');
 assert.ok(anime.includes('No video added yet'),'Episodes without a saved video must show a clear empty player state');
 assert.ok(anime.includes("ownerClient.from('staff_roles').select('role')"),'Episode editing must verify the signed-in site owner role');
 assert.ok(anime.includes("ownerClient.from('anime_episode_watch_links').upsert"),'The owner must be able to save episode video metadata to Supabase');
 assert.ok(anime.includes("B2_MEDIA_API='https://all-in-one-edition-media.plsgivemediscord981.workers.dev'"),'Watch uploads must use the configured Backblaze B2 media Worker');
 assert.ok(anime.includes("visibility:'public'")&&anime.includes("'/signed-url'"),'Watch videos must use public B2 objects with signed playback links');
 assert.ok(anime.includes('MAX_VIDEO_BYTES=1024*1024*1024')&&anime.includes('file.size>MAX_VIDEO_BYTES'),'The Watch uploader must enforce its 1 GB limit');
 assert.ok(anime.includes("saveEpisodeVideoRow('B2 Storage',mediaUrl)")&&anime.includes("saved.provider==='B2 Storage'"),'New Watch videos must be saved and identified as B2 media');
 assert.ok(anime.includes('await getB2PlaybackUrl(saved.watch_url)')&&anime.includes('deleteB2Media(existing.watch_url)'),'Watch playback and owner cleanup must use the B2 media API');
 assert.ok(anime.includes('validateSelfHostedVideoUrl'),'Direct video URLs must still be validated');
 assert.ok(anime.includes('Drop your video file here'),'The owner must have a dedicated video upload drop zone');
 assert.ok(anime.includes('This editor is restricted to the site owner account.'),'Episode editing must stay owner-only');
 assert.ok(!anime.includes('watchLinks')&&!anime.includes('sourceLinks'),'The old external provider and episode-source panels should stay removed');
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
assert.ok(html.includes("v.preload='none'"), 'Main hub videos should not preload the entire feed');
assert.ok(!html.includes('socialPreloadNextVideos') && !html.includes('scheduleSocialVideoPreload') && !html.includes('socialPreloadDuringIdle'), 'Main hub must not preload videos in the background while idle');
assert.ok(!html.includes('autoplay loop preload="auto" data-social-video'), 'Main hub Social videos must not all auto-download on render');
assert.ok(!social.includes('videoPreloadObserver') && !social.includes("rootMargin:'650px 0px'"), 'Separate Social page must not download upcoming videos before they are visible');
assert.ok(social.includes("function prepareSocialVideo(video,preload='auto',priority='low')") && social.includes('video.src=socialMediaPlaybackURL(src)'), 'Separate Social page should lazily attach video URLs with explicit preload and priority controls');
assert.ok(backend.includes('function prepareGalleryVideo(video)'), 'Video gallery should load individual videos on demand');
assert.ok(backend.includes("player.preload='none'") && backend.includes('player.dataset.videoSrc=post.media_url'), 'Video gallery cards must not attach every video URL as they render');
assert.ok(backend.includes("rootMargin:'0px'") && backend.includes('prepareGalleryVideo(entry.target)'), 'Video gallery should fetch a video only when its card enters the viewport');

assert.ok(social.includes('data-video-src=') && !social.includes("'<video src=\"'+escapeHTML(p.media_url)+'\" data-social-video"), 'Separate Social feed should not attach every video source during rendering');
assert.ok(anime.includes("video.dataset.videoSrc=saved.watch_url;video.preload='none'"), 'Anime episodes should not request video bytes merely when selected');
assert.ok(anime.includes('getB2PlaybackUrl'), 'B2 Watch playback must use short-lived signed media URLs.');
assert.ok(html.includes('href="https://btnbuchsrfllpzlypjtn.supabase.co" crossorigin') && social.includes('href="https://btnbuchsrfllpzlypjtn.supabase.co" crossorigin') && anime.includes('href="https://btnbuchsrfllpzlypjtn.supabase.co" crossorigin'), 'Video pages should preconnect to their storage API');

// Keep one source of truth for favourites and avoid eager-fetching dozens of covers.
assert.ok(!ux.includes('addFavouriteButtons'), 'Discovery must not inject a duplicate favourites button system');
assert.ok(!ux.includes('aio-favourite-button'), 'Each game card should keep only its native favourite control');
assert.ok(ux.includes("discoveryFilter==='favourites'") && ux.includes('favouriteGames.has(gameKey(x.g))'), 'The discovery favourites filter must use the existing saved favourites');
assert.ok((html.includes("const priority=i<6?'eager':'lazy'")||html.includes("const priority=position<6?'eager':'lazy'")), 'Only the first six game covers should be eager-loaded for a lighter initial render');
assert.ok(ux.includes('60000-(Date.now()%60000)'), 'The minute-only clock should align updates to minute boundaries');
assert.ok(appearance.includes('function applyPerformanceProfile()') && appearance.includes("root.dataset.aioPerformanceProfile=constrained?'lite':'full'"), 'Appearance should detect constrained hardware and apply a lightweight profile.');
assert.ok(glassCss.includes('data-aio-performance-profile="lite"') && glassCss.includes('--aio-glass-blur:12px') && glassCss.includes('#gameGrid .card{animation:none!important'), 'The lightweight profile should reduce glass blur and card animation cost.');



 // The hub should never bulk-download artwork or game pages while idle.
 assert.ok(!html.includes('cacheGameImagesInBackground')&&!html.includes('warmGamePagesInBackground')&&!html.includes('addEarlyPrefetchHints'),'Game artwork and game pages must not be prefetched in the background');
 assert.ok(!html.includes("link.rel='prefetch'"),'The homepage must not inject game-page prefetch links');
 assert.ok(html.includes('visibleLimit=48')&&html.includes('visibleLimit+=48'),'The initial game grid and load-more batches should stay bounded');
 assert.ok(html.includes('let gameSearchTimer=0;')&&html.includes('gameSearchTimer=setTimeout(()=>')&&html.includes('},100)'),'Game search should debounce rapid keystrokes');
 assert.ok(html.includes('Render the local game catalogue immediately'),'The game catalogue must render on first page load.');
 assert.ok(html.includes('loading="lazy" fetchpriority="low"')&&html.includes('slice(0,18)'),'The intro should lazy-load a smaller set of game covers');
 assert.ok(ux.includes('function startAioDashboardClock()')&&ux.includes('window.aioDashboardClockTimer=setInterval(tick,1000)')&&ux.includes("document.addEventListener('visibilitychange',sync)"),'Dashboard date, time and hometime should share one visible-tab clock');
assert.ok(ux.includes('WELCOME · SETUP + WALKTHROUGH')&&ux.includes('STEP 5 OF 6 · QUICK TOUR')&&ux.includes('aio-setup-tour-card'),'The first-run setup must include the guided hub walkthrough');
assert.ok(html.includes('Personalisation · Setup tutorial')&&html.includes('window.openAioOnboarding?.()')&&html.includes('window.resetAioOnboarding?.()')&&ux.includes('aioOnboardProgress'),'Settings should replay or reset the integrated setup and show progress');
assert.ok(!html.includes('tutorialOverlay')&&!html.includes('function startTutorial')&&!html.includes('setTimeout(startTutorial'),'The old standalone tutorial must not run separately');
 assert.ok(html.includes('if(!worldClockTimer)worldClockTimer=setInterval(updateWorldClock,60000)'),'World clocks should refresh once per minute');
 assert.ok(html.includes('setInterval(updateCountdown,1000)')&&html.includes('if(swRunning&&!stopwatchTimer)'),'Countdown and stopwatch redraw loops should run only while active');
 assert.ok(html.includes('setInterval(pomoTick,1000)')&&html.includes('clearInterval(pomodoroTimer)'),'Pomodoro should use one-second visible updates');
 assert.equal(html.split("let calcExpr='").length-1,1,'The calculator state must be declared only once');
 assert.ok(!html.includes('socialFitOnScrollTimer')&&!html.includes("if(location.hash.includes('social')"),'Social should not repeatedly scan posts or recreate observers during scrolling');
 assert.ok(html.includes("v.dataset.socialSetupBound==='1'"),'Social player event handlers must be idempotent');
 assert.ok(html.includes('function initLiveUpdates()')&&html.includes("rootMargin:'300px 0px'"),'Live data should only be requested near the Live section');
 assert.ok(html.includes('Promise.allSettled([loadNews(),loadFootball()])')&&!html.includes('safeBoot(refreshLive)'),'News and football requests must not start during homepage boot');
 assert.ok(html.includes('clearTimeout(liveRefreshTimer)')&&html.includes('else if(liveSectionVisible)refreshLive()'),'Live refreshes should pause off-screen and while the tab is hidden');

 console.log('Frontend contract checks passed: appearance persistence, context menu/game freeze wiring, auth/video safeguards, and economy/security migration contracts.');

assert.ok(ux.includes("['sakura','Sakura (fallback)'"), 'First-run setup should expose the Sakura fallback font.');
assert.ok(html.includes('Personalisation · Setup tutorial') && html.includes('Reset tutorial') && html.includes('window.resetAioOnboarding?.()'), 'Settings should offer both replay and reset for the integrated tutorial.');
assert.ok(ux.includes('window.openAioOnboarding=()=>openOnboard(false)') && ux.includes('window.resetAioOnboarding=()=>'), 'Replaying the tutorial must preserve completion; reset must be a separate action.');
assert.ok(social.includes('const FEED_PAGE_SIZE=24') && social.includes('.range(feedOffset,feedOffset+FEED_PAGE_SIZE-1)'), 'Social should load the feed in bounded Supabase pages.');
assert.ok(social.includes('function appendFeedSentinel') && social.includes('loadFeed(true)') && social.includes('feed-load-more'), 'Social should load additional posts as the feed approaches its end.');
assert.ok(social.includes(".in('post_id',pageIds)"), 'Social engagement counts should be fetched only for posts in the current batch.');

assert.ok(social.includes("let feedSort=['latest','popular','oldest']") && social.includes("feedSort==='popular'") && social.includes("localWrite(STORAGE_KEYS.feedSort,feedSort)"), 'Social sort preferences should offer persistent latest, most-liked and oldest ordering.');
assert.ok(social.includes('function renderFeed(preserveScroll=false)') && social.includes('if(preserveScroll)feed.scrollTop=previousScrollTop') && social.includes('renderFeed(addToFeed)'), 'Loading older posts should preserve the reader scroll position.');


// Backblaze B2 media storage contract.
const mediaWorker = read('cloudflare/media-worker/src/index.ts');
assert.ok(mediaWorker.includes('Cache-Control", "private, no-store'), "Signed B2 media responses must not be cached as public content.");
const mediaWrangler = read('cloudflare/media-worker/wrangler.toml');
const mediaSchema = read('supabase/migrations/20261106202316_aio_r2_media_objects.sql');
const mediaRlsSchema = read('supabase/migrations/20261106202335_optimize_aio_media_rls.sql');
const mediaPartsSchema = read('supabase/migrations/20261106202434_aio_r2_upload_parts.sql');
const mediaPublicSchema = read('supabase/migrations/20261107081135_aio_media_public_playback.sql');
assert.ok(mediaWorker.includes('B2_ENDPOINT') && mediaWorker.includes('B2_APPLICATION_KEY') && mediaWorker.includes('AwsClient'), 'The media Worker must use server-side Backblaze B2 credentials and SigV4.');
assert.ok(mediaWorker.includes('user_id:') && mediaWorker.includes('eq.${userId}'), 'Every media lookup must be scoped to the authenticated owner.');
assert.ok(mediaWorker.includes('b2Request(env') && mediaWorker.includes('UploadId'), 'B2 uploads must use authenticated multipart requests.');
assert.ok(mediaWorker.includes('hasExpectedMagic') && mediaWorker.includes('video/quicktime'), 'The Worker must check uploaded file signatures, including iPad QuickTime videos.');
assert.ok(mediaWorker.includes('dbUpsertPart') && mediaWorker.includes('dbGetParts') && mediaWorker.includes('dbDeleteParts'), 'Multipart progress must persist and be verified server-side.');
assert.ok(mediaWorker.includes('Accept-Ranges') && mediaWorker.includes('Content-Range') && mediaWorker.includes('rangeHeader'), 'B2 video playback must support byte-range seeking.');
assert.ok(mediaWorker.includes('status !== "ready"') && mediaWorker.includes('row.status !== "uploading"'), 'Only completed uploads may be played and only active uploads may be completed.');
assert.ok(mediaWorker.includes('MAX_PART_BYTES = 32 * 1024 * 1024') && mediaWorker.includes('MAX_PARTS = 10_000') && mediaWorker.includes('MAX_OBJECT_BYTES = MAX_PARTS * MAX_PART_BYTES'), 'Multipart transport limits must be explicit and bounded.');
assert.ok(mediaWorker.includes('input.visibility === "public"') && mediaWorker.includes('dbGetPublic') && mediaWorker.includes('signed-url'), 'Public Watch media must be served through short-lived signed links.');
assert.ok(mediaSchema.includes('enable row level security') && mediaRlsSchema.includes('using ((select auth.uid()) = user_id)'), 'Media metadata must be protected by owner-scoped RLS.');
assert.ok(mediaSchema.includes('revoke all on public.aio_media_objects from public, anon, authenticated') && mediaSchema.includes('grant select (id, user_id, filename, content_type, size_bytes, status, created_at, completed_at)'), 'Browser clients must not receive internal B2 keys or multipart IDs.');
assert.ok(mediaPartsSchema.includes('revoke all on public.aio_media_upload_parts from public, anon, authenticated'), 'Multipart ETags and upload state must remain server-only.');
assert.ok(mediaWrangler.includes('B2_ENDPOINT') && mediaWrangler.includes('B2_BUCKET = "allinoneedition-media"') && !mediaWrangler.includes('r2_buckets'), 'The media Worker must be configured for Backblaze B2 rather than Cloudflare R2.');
assert.ok(mediaPublicSchema.includes("check (visibility in ('private', 'public'))"), 'Public visibility must be represented in the database schema.');
assert.ok(!html.includes('SUPABASE_SERVICE_ROLE_KEY') && !social.includes('SUPABASE_SERVICE_ROLE_KEY') && !anime.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Privileged Supabase credentials must never be added to browser pages.');
assert.ok(mediaWorker.includes('partNumber === 1 && !hasExpectedMagic(row.content_type, bytes)'), 'The first uploaded part must match its declared content type before B2 stores it.');
// Owner-only administration must fail closed in the UI and be pinned in the database.
const ownerSchema = read('supabase/migrations/20261106203137_pin_canonical_aio_owner.sql');
const staffGate = backend.match(/window\.refreshAioStaffPanel = async function\(\)\{[\s\S]*?\n  \};/)?.[0] || '';
assert.ok(staffGate.indexOf("panel.classList.add('hidden')") >= 0 && staffGate.indexOf("panel.classList.add('hidden')") < staffGate.indexOf("from('staff_roles')"), 'Staff management must remain hidden while the role is verified.');
assert.ok(staffGate.indexOf("if(staffRole!=='owner')") >= 0 && staffGate.indexOf("if(staffRole!=='owner')") < staffGate.indexOf("panel.classList.remove('hidden')"), 'Only the verified owner role may reveal staff management.');
assert.ok(!staffGate.includes('aio_owner_exists'), 'Unverified visitors must not receive owner bootstrap controls.');
assert.ok(ownerSchema.includes('private.aio_platform_owner') && ownerSchema.includes('private.aio_is_owner()'), 'Owner authority must be stored outside user-editable profile metadata.');
assert.ok(ownerSchema.includes('Only the canonical owner account may hold the owner role') && ownerSchema.includes('cannot be reassigned or demoted'), 'The canonical owner role must not be granted to other accounts or removed.');
assert.ok(ownerSchema.includes('Site owner can insert staff roles') && ownerSchema.includes('Site owner can update staff roles') && ownerSchema.includes('Site owner can delete staff roles'), 'Staff role changes must be protected by separate owner-only RLS policies.');


// The homepage uses a simple local game search; the separate AI Search UI is removed.
assert.ok(html.includes('id="search"') && html.includes("addEventListener('input'"), 'The homepage game search must filter the local catalogue.');
assert.ok(!html.includes('id="aiSearchOpen"') && !html.includes('id="aioAiSearch"') && !html.includes('searchSparkle'), 'The unused AI Search panel and search-options popup must stay removed.');
assert.ok(html.includes('"name":"Shy Safari"') && html.includes('"name":"Times Tables Speed Escape"') && html.includes('"name":"Steal an Egg 3x3"'), 'The three requested games must be in the visible game catalogue.');
assert.ok(!html.includes('Slime Keyboard Escape'), 'Slime Keyboard Escape must remain removed.');
assert.ok(!html.includes('id="hideBtn"') && !html.includes('id="darkBtn"'), 'The Hide and Dark controls must remain removed.');
assert.ok(html.includes('#gameModal.open .modalhead') && html.includes('#gameModal.open .progressbarbox'), 'The game player must hide its bulky header and progress bars while a game is open.');
// Watch source metadata is private and only the canonical owner can inspect it.
const watchSourceSchema = read('supabase/migrations/20261106204516_private_anime_episode_source_metadata.sql');
assert.ok(watchSourceSchema.includes('drop policy if exists "Public can read anime episode watch links"') && watchSourceSchema.includes('revoke all on public.anime_episode_watch_links from public, anon'), 'Watch provider URLs must not be publicly readable.');
assert.ok(watchSourceSchema.includes('using ((select private.is_aio_site_owner()))'), 'Only the canonical owner may read Watch source metadata.');
assert.ok(anime.includes("ownerClient.from('anime_episode_watch_links')"), 'The Watch source manager must use the owner-authenticated client.');
assert.ok(!anime.includes('Open official Bing watch page'), 'The normal Watch player must not display unnecessary provider branding.');


assert.ok(html.includes('async function askAioAssistant') && html.includes("else askAioAssistant('assistantChat',q)") && html.includes("else askAioAssistant('assistantModalChat',q)"), 'Smart Answer must use real streaming AI for open-ended questions.');




assert.ok(html.includes('id="assistantBtn" type="button" onclick="location.href=\'/elementor\'"'), 'The top-bar Elementor AI button must open the standalone workspace.');
assert.ok(html.includes("location.href='/elementor'") && vercel.includes('"source": "/elementor"'), 'Elementor must have a dedicated route from the main site.');
assert.ok(elementor.includes('id="history"') && elementor.includes('elementor_conversations') && elementor.includes('elementor_messages'), 'Elementor must persist separate conversations and messages.');
assert.ok(elementor.includes('id="avatarChoices"') && elementor.includes('id="avatarUpload"') && elementor.includes('id="instructions"') && elementor.includes('id="responseStyle"'), 'Elementor must provide custom profile pictures and personalisation controls.');
assert.ok(elementor.includes('historySearch') && elementor.includes('renameChat') && elementor.includes('deleteChat') && elementorAvatarSchema.includes('avatar_media_id'), 'Elementor chats must be searchable, renameable, deletable, and support private custom profile pictures.');
assert.ok(elementor.includes("AI_API+'/chat'") && elementor.includes("AI_API+'/generate'"), 'Elementor chat and image generation must use the authenticated AI Worker.');
assert.ok(elementor.includes("MEDIA_API+'/uploads/initiate'") && elementor.includes("MEDIA_API+'/media/'"), 'Generated images must be saved to private B2 media and loaded with owner authentication.');
assert.ok(elementor.includes("from('staff_roles')") && elementor.includes("data?.role==='owner'") && elementorSchema.includes("s.role = 'owner'"), 'Elementor site controls must be restricted to the verified owner role.');
assert.ok(elementorWorker.includes('authenticatedUser') && elementorWorker.includes('llama-3.3-70b-instruct-fp8-fast') && elementorWorker.includes('flux-1-schnell'), 'Elementor Worker must authenticate chat and image requests.');
assert.ok(elementorSchema.includes('enable row level security') && elementorSchema.includes('Users manage their Elementor conversations') && elementorSchema.includes('Public can read Elementor announcements'), 'Elementor chat data must be protected by RLS while public announcement text remains readable.');


// Game catalogue refresh: keep the library intact and provide visible, usable controls.
const catalogueCss=read('game-catalogue.css');
const catalogRegistryStart=html.indexOf('const GAMES=')+'const GAMES='.length;
const catalogRegistryEnd=html.indexOf(';const EXTRA_',catalogRegistryStart);
assert.ok(catalogRegistryStart>='const GAMES='.length&&catalogRegistryEnd>catalogRegistryStart,'The games registry must stay readable.');
const catalogueEntries=JSON.parse(html.slice(catalogRegistryStart,catalogRegistryEnd));
assert.ok(catalogueEntries.length>=875,'All original game registry entries must stay present.');
assert.ok(['Shy Safari','Times Tables Speed Escape','Steal an Egg 3x3'].every(title=>catalogueEntries.some(game=>game.name===title)),'Requested catalogue additions must stay intact.');
assert.ok(html.includes('href="/game-catalogue.css"')&&catalogueCss.includes('#games .games')&&catalogueCss.includes('@media(max-width:700px)'),'Catalogue layout must stay responsive and scoped to the games section.');
assert.ok(html.includes('id="catalogResults" role="status" aria-live="polite"')&&html.includes('id="gameSort"')&&html.includes('id="clearGameSearch"'),'Game controls must include live result counts, sorting, and search reset.');
assert.ok(html.includes("const totalByCat=new Map()")&&html.includes("aria-pressed=")&&html.includes("data-cat="),'Category filters must show counts and selected state.');
assert.ok(html.includes("function setGameSort(value)")&&html.includes("function resetCatalogueFilters()")&&html.includes("function loadMoreGames(){visibleLimit+=48;renderGames()}"),'Sorting, empty-state recovery, and load more must stay functional.');
assert.ok(html.includes('visibleLimit=Math.max(48,visibleLimit)')&&html.includes('shown.map((entry,position)=>cardHTML(entry.g,entry.i,position))'),'A short filter result must not permanently shrink the next render, and image priority must use visible card order.');
assert.ok(html.includes('role="button" tabindex="0" aria-label="Play ')&&catalogueCss.includes('.card:focus-visible'),'Game cards must be keyboard-accessible.');
assert.ok(!html.includes('Huge game library')&&!html.includes('<strong>Quick picks</strong>'),'Duplicated clutter panels must remain removed.');
console.log('Game catalogue UI contracts passed; preserved '+catalogueEntries.length+' original game entries.');
