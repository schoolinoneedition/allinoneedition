'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'),owner=read('owner.html'),video=read('video.html'),watch=read('anime.html'),worker=read('cloudflare/elementor-ai/worker.ts'),backend=read('backend-features.js'),mediaWorker=read('cloudflare/media-worker/src/index.ts');
const routes=JSON.parse(read('vercel.json')).rewrites;
assert.ok(!fs.existsSync(path.join(root,'game-catalogue.css')),'Broken catalogue override must remain removed.');
assert.ok(index.includes('id="gameGrid"')&&index.includes('id="filters"')&&index.includes('<strong>Quick picks</strong>'),'Restore the original catalogue, including its original Quick picks section.');
assert.ok(index.includes('id="unifiedGameSearch"')&&index.indexOf('id="unifiedGameSearch"')<index.indexOf('<main id="app">'),'Search must be in the original topbar.');
assert.ok(!index.includes('id="siteLoader"')&&!index.includes('MIN_VISIBLE_MS=7500')&&index.includes('safeBoot(renderGames);'),'Startup splash is removed; the existing game catalogue must render immediately.');
const start=index.indexOf('const GAMES=')+'const GAMES='.length,end=index.indexOf(';const EXTRA_',start);
assert.ok(start>12&&end>start,'The original GAMES list must remain valid.');
const games=JSON.parse(index.slice(start,end));
assert.ok(games.length>=875,'The original game registry must stay intact.');
for(const title of ['Shy Safari','3x3 +1 Keyboard Escape','3x3 Steal an Egg'])assert.ok(games.some(game=>game.name===title),'Missing original game '+title);
assert.ok(index.includes('</textarea><iframe id="codePreview"')&&!index.slice(0,index.indexOf('</main>')).includes('</body>'),'Code Lab must not close the document before later sections.');
assert.ok(index.includes('<h1>One site. Games, school, tools and live info.</h1>')&&!index.includes('id="aio-feature-hub"'),'Homepage must return to the exact pre-redesign hero and card layout.');
assert.ok(index.includes('loadPublishedOwnerGames')&&index.includes(".eq('status','approved')"),'Only approved cloud games may enter the live catalogue.');
assert.ok(index.includes("supabaseClient.from('aio_game_submissions')")&&index.includes('knownUrls.add('),'Cloud games must join the existing registry without duplicates.');
assert.ok(owner.includes("auth.getUser()")&&owner.includes("from('staff_roles')")&&owner.includes("role.data?.role!=='owner'"),'Owner Studio must verify account and owner role before showing controls.');
assert.ok(owner.includes("id=\"ownerWorkspace\" hidden")&&owner.includes("aio_submit_game")&&owner.includes("aio_review_game_submission"),'Owner Studio must publish via the protected game RPCs.');
assert.ok(backend.includes("ownerStudioButton?.classList.add('hidden')")&&backend.includes("ownerStudioButton?.classList.remove('hidden')"),'The owner shortcut must default to hidden and appear only after role verification.');
assert.ok(!owner.includes('SUPABASE_SERVICE_ROLE_KEY')&&!video.includes('SUPABASE_SERVICE_ROLE_KEY'),'Private backend keys must never be embedded in public pages.');
assert.ok(video.includes("AI Video Studio")&&video.includes("costConfirmed:true")&&video.includes("userConsent:true")&&video.includes('id="consent" type="checkbox" required'),'Video creation must use the current protected worker with explicit paid-cost approval.');
assert.ok(worker.includes('url.pathname==="/video"')&&worker.includes('if(!user)')&&worker.includes('unsafeVideoPrompt')&&worker.includes('disable_safety_filter:false'),'Worker video generation must require a signed-in account and keep its safety filter enabled.');
assert.ok(watch.includes('href="/video"')&&watch.includes('href="/owner"')&&watch.includes("ownerClient.from('staff_roles')"),'Watch must retain its owner verification and link to both studio pages.');
assert.ok(routes.some(r=>r.source==='/owner'&&r.destination==='/owner.html')&&routes.some(r=>r.source==='/video'&&r.destination==='/video.html'),'Standalone pages must have clean URLs.');
for(const name of ['index.html','owner.html','video.html','anime.html']){
 const html=read(name);
 let scripts=0;
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/\bsrc\s*=/.test(m[1]) || /\btype\s*=\s*["']application\/ld\+json["']/i.test(m[1]))continue;
  new vm.Script(m[2],{filename:name+' inline script '+scripts++});
 }
 assert.ok(scripts>0,name+' needs at least one valid inline script');
}

/* Owner-only HTML uploads: isolated by opaque iframe origin AND restrictive CSP. */
const htmlSandbox=read('html-game-sandbox.js');
const htmlSchema=read('supabase/migrations/20261113220000_owner_html_game_uploads.sql');
assert.ok(owner.includes('id="htmlGameFile"')&&owner.includes('id="htmlDrop"')&&owner.includes('id="htmlGameForm"'),'Owner Studio must support file picker and drop zone.');
assert.ok(owner.includes('selectedHtmlFile.text()')&&owner.includes('file.size>HTML_LIMIT'),'HTML files must be read on demand with a strict client-side size bound.');
assert.ok(owner.includes("from('aio_uploaded_html_games').insert")&&owner.includes('html_content:html,published:true'),'HTML must be stored only through the authenticated owner database client.');
assert.ok(owner.includes('loadHtmlGames')&&owner.includes('updateHtmlGame')&&owner.includes('id="htmlPreviewFrame"'),'Owner can preview, hide, publish and delete HTML uploads.');
assert.ok(owner.includes('window.AioHtmlGameSandbox.loadIntoFrame(frame,html)'),'Owner preview must use the same sandbox as public gameplay.');
assert.ok(index.includes('loadPublishedHtmlGames()')&&index.includes("select('id,title,description,category,thumbnail_url')"),'The public catalogue must fetch HTML metadata only, not bulk-download game code.');
assert.ok(index.includes("select('html_content')")&&index.includes("function isUploadedHtmlGame")&&index.includes('serial!==htmlGameLoadSerial'),'Opening a game must fetch code on demand and reject stale loads.');
assert.ok(index.includes("window.AioHtmlGameSandbox?.clearFrame($('gameFrame'))"),'Closing a game must drop the sandbox document.');
assert.ok(htmlSandbox.includes("frame.setAttribute('sandbox','allow-scripts allow-pointer-lock')")&&!htmlSandbox.includes('allow-same-origin'),'Uploaded games must not inherit the main site origin.');
for(const directive of ["default-src 'none'","script-src 'unsafe-inline'","connect-src 'none'","frame-src 'none'","form-action 'none'","base-uri 'none'"])assert.ok(htmlSandbox.includes(directive),'Missing sandbox restriction: '+directive);
assert.ok(htmlSandbox.includes("doc.head.prepend(meta)")&&htmlSandbox.includes("frame.srcdoc=renderDocument(html)"),'CSP must be installed before executing uploaded HTML.');
assert.ok(htmlSchema.includes('enable row level security')&&htmlSchema.includes('private.is_aio_site_owner()'),'Owner writes must be protected by the canonical owner role.');
assert.ok(htmlSchema.includes("Everyone can see published HTML games")&&htmlSchema.includes('using (published = true)'),'Only published games are publicly readable.');
assert.ok(htmlSchema.includes('octet_length(html_content) between 64 and 524288'),'The database must bound HTML size independently of the UI.');
new vm.Script(htmlSandbox,{filename:'html-game-sandbox.js'});
console.log('Single-file HTML upload contracts passed: owner RLS, isolated preview, lazy public player and sandbox CSP.');


// Supplied 3x3 game-page HTML includes standalone iframe sources, not the game assets.
// Open the actual source game rather than nesting the original publisher's site chrome.
const egg=games.find(g=>g.name==='3x3 Steal an Egg');
const escape=games.find(g=>g.name==='3x3 +1 Keyboard Escape');
assert.ok(egg&&escape,'Both user-requested 3x3 games must exist.');
assert.equal(new Set(games.map(game=>game.url)).size,games.length,'Catalogue URLs must remain unique as games are added.');
const eggUrl=new URL(egg.url),escapeUrl=new URL(escape.url);
assert.equal(eggUrl.hostname,'www.timestables.com');
assert.equal(eggUrl.pathname,'/gf/3x3-steal-egg/20261112-1036/index.html');
assert.equal(eggUrl.searchParams.get('multiplayer'),'wss://tsu3.tafeldiploma.nl/eggs/multiplayer');
assert.equal(eggUrl.searchParams.get('swap'),'1');
assert.equal(escapeUrl.hostname,'www.timestables.com');
assert.equal(escapeUrl.pathname,'/gf/3x3-speed/20261102-1517/index.html');
assert.equal(escapeUrl.searchParams.get('multiplayer'),'wss://tsu3.tafeldiploma.nl/multiplayer');
assert.equal(escapeUrl.searchParams.get('keys'),'3d');
assert.equal(escapeUrl.searchParams.get('avatar'),'glb');
assert.ok(!egg.url.includes('3x3-eggs.html')&&!escape.url.includes('3x3-speed-escape.html'),'3x3 games must not launch publisher page wrappers.');
assert.ok(egg.cat==='Puzzle'&&escape.cat==='Puzzle','Keep original game category.');


// Restore the user's original game-player controls for the two 3x3 games only.
// The rest of the catalogue and its full-window player must remain unchanged.
const eggLogo=read('assets/3x3-steal-an-egg.svg');
const keyboardLogo=read('assets/3x3-keyboard-escape.svg');
const egg3x3=games.find(g=>g.name==='3x3 Steal an Egg');
const keyboard3x3=games.find(g=>g.name==='3x3 +1 Keyboard Escape');
assert.ok(egg3x3&&keyboard3x3,'Both requested 3x3 games must remain published in the original registry.');
assert.ok(games.length>=881,'The original games and six new games must remain available.');
assert.equal(egg3x3.img,'/assets/3x3-steal-an-egg.svg');
assert.equal(keyboard3x3.img,'/assets/3x3-keyboard-escape.svg');
assert.notEqual(egg3x3.img,keyboard3x3.img,'Each 3x3 game needs its own cover artwork.');
assert.ok(eggLogo.includes('STEAL AN EGG')&&eggLogo.includes('3×3'),'Eggs logo needs its own recognisable artwork and wording.');
assert.ok(keyboardLogo.includes('KEYBOARD ESCAPE')&&keyboardLogo.includes('3×3'),'Keyboard logo needs its own recognisable artwork and wording.');
for(const asset of [eggLogo,keyboardLogo]){
 assert.match(asset,/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
 assert.match(asset,/<\/svg>\s*$/);
 assert.ok(!/<script|onload=|foreignObject|<image\s/i.test(asset),'Vector artwork must not contain executable or remote content.');
}

assert.ok(index.includes('id="gameModal"')&&index.includes('id="gameModalBox"')&&index.includes('id="fsBtn"'),'Keep the original game modal and Fullscreen control.');
assert.ok(!index.includes('game3x3Corner')&&!index.includes('game-3x3-corner')&&!index.includes('id="game3x3Identity"'),'Do not reintroduce the custom overlay player UI.');
assert.ok(!index.includes('aio-3x3-direct')&&!index.includes('clip-path:polygon('),'3x3 games must not have a black cut-out or legacy host-toolbar crop.');
assert.ok(index.includes("#gameModal #gameFrame{clip-path:none}")&&index.includes("$('gameFrame').allowFullscreen=true;"),'3x3 game frames must remain rectangular and support fullscreen.');
assert.ok(index.includes('async function loadGameIntoFrame(g)')&&index.includes("select('html_content')"),'Uploaded HTML game playback must survive the UI rollback.');
assert.ok(!index.includes('id="aio-feature-hub"'),'The new video-first homepage redesign must stay reverted.');

assert.ok(watch.includes('function refreshHostedOpenLink(mediaUrl)')&&watch.includes('refreshHostedOpenLink(hostedUrl)'), 'B2 Open links must be signed for browser playback.');
assert.ok(watch.includes('const startSession=await ownerClient.auth.getSession()'), 'Watch must refresh owner authentication before initiating an upload.');
assert.ok(watch.includes('Number(init.partSizeBytes)||8*1024*1024,8*1024*1024'), 'Watch should use mobile-friendly 8 MiB multipart chunks.');
assert.ok(watch.includes('failure.permanent=true')&&watch.includes('if(error.permanent||/Session expired/'), 'Stop retrying permanent upload failures and expired login sessions.');
assert.ok(watch.includes('const abortSession=await ownerClient.auth.getSession()'), 'Watch must refresh auth when aborting failed uploads.');

assert.ok(watch.includes('id="showSearch"')&&watch.includes("addEventListener('input',renderSeries)"),'Watch must support searching show titles without changing the existing filters.');
assert.ok(watch.includes('watchCoverObserver')&&watch.includes("image.dataset.watchCover=s.banner"),'Watch show posters should lazy-load near their viewport instead of downloading the whole set eagerly.');
assert.ok(watch.includes('"@type":"CollectionPage"')&&watch.includes('href="/browser-games"'), 'Watch must carry crawlable SEO metadata and a real games link.');
assert.ok(watch.includes('Anime Episode Tracker & Cartoon Guides')&&watch.includes('id="watchGuideTitle"')&&watch.includes('Where do Watch videos come from?'), 'Watch search intent and helpful visible episode tracking answers must be preserved.');
assert.equal((watch.match(/class="series-card series-placeholder"/g)||[]).length, 13, 'Watch reserves initial space for all 13 shows before the script is ready.');
assert.ok(watch.includes('aria-busy="true"')&&watch.includes("grid.removeAttribute('aria-busy')"), 'The Watch loading grid must become accessible after rendering.');

assert.ok(mediaWorker.includes('new Uint8Array(body)'), 'B2 part uploads must use a fixed-length typed array so Cloudflare sends Content-Length.');
assert.ok(mediaWorker.includes('isSiteOwner(env, user.id)')&&mediaWorker.includes('MAX_WATCH_VIDEO_BYTES'), 'The media worker must restrict public episode hosting to the owner and one GiB.');
assert.ok(mediaWorker.includes('providerCode')&&mediaWorker.includes('b2_transfer_failed'), 'B2 provider errors must be classified and visible to clients without exposing storage secrets.');
assert.ok(watch.includes("const magic=new Uint8Array(await file.slice(0,16).arrayBuffer())"), 'Watch should validate file bytes before initiating an upload.');
assert.ok(watch.includes("await getB2PlaybackUrl(watchUrl)"), 'Watch must not claim unpublished or unfinished media is ready for playback.');
assert.ok(watch.includes("phase='sending part '")&&watch.includes('B2 upload failed while '), 'Watch should report the failed upload stage for troubleshooting.');
assert.ok(watch.includes('id="saveHostedEpisode"')&&watch.includes("addEventListener('click',saveHostedVideoToEpisode)"), 'Watch must expose a real Save video to episode button.');
assert.ok(watch.includes("rememberPendingHostedVideo(target,mediaUrl)")&&watch.includes("clearPendingHostedVideo(target,mediaUrl)"), 'Completed video uploads must be recoverable until episode publishing succeeds.');
assert.ok(watch.includes("phase='publishing the episode'")&&watch.includes("updateHostedSaveButton()"), 'Watch should let owners retry a failed save after B2 upload completes.');
assert.ok(watch.includes("const pending=(!saved&&pendingHostedVideo(selectedEpisode))||null"), 'Reopening the same episode should restore a pending hosted video in the current browser tab.');
const helperStart=watch.indexOf('const PENDING_WATCH_UPLOAD=');
const helperEnd=watch.indexOf('function updateOwnerEditor(',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart,'Watch save helpers must be present.');
{
 const items=new Map(),storage=new Map();
 const episode={seriesId:'pokemon',seasonIndex:0,episodeNumber:1};
 const mediaUrl='https://all-in-one-edition-media.plsgivemediscord981.workers.dev/media/11111111-1111-4111-8111-111111111111';
 const ctx={
  siteOwner:true,episodeUploadActive:false,selectedEpisode:episode,currentSession:{user:{id:'owner-test'}},
  B2_MEDIA_API:'https://all-in-one-edition-media.plsgivemediscord981.workers.dev',
  episodeLinks:new Map(),watchLinkKey:(a,b,c)=>a+':'+b+':'+c,
  validateSelfHostedVideoUrl:x=>x,
  sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  $:id=>items.get(id),
  saveEpisodeVideoRow:async()=>{}
 };
 items.set('saveHostedEpisode',{disabled:false,textContent:''});
 items.set('hostedVideoUrl',{value:mediaUrl});
 items.set('ownerLinkStatus',{textContent:''});
 vm.runInNewContext(watch.slice(helperStart,helperEnd)+';globalThis.pending=pendingHostedVideo;globalThis.remember=rememberPendingHostedVideo;globalThis.clear=clearPendingHostedVideo;globalThis.syncSave=updateHostedSaveButton;',ctx);
 ctx.remember(episode,mediaUrl);
 assert.equal(ctx.pending(episode),mediaUrl,'A finished upload should be recoverable for its original episode.');
 assert.equal(ctx.pending({seriesId:'pokemon',seasonIndex:0,episodeNumber:2}),null,'A pending upload must not move to a different episode.');
 ctx.syncSave();
 assert.equal(items.get('saveHostedEpisode').disabled,false,'A pending upload should enable Save video.');
 ctx.episodeLinks.set('pokemon:0:1',{watch_url:mediaUrl});
 ctx.syncSave();
 assert.equal(items.get('saveHostedEpisode').disabled,true,'A saved video should not allow redundant publishing.');
 ctx.clear(episode,mediaUrl);
 assert.equal(ctx.pending(episode),null,'Successful saving should clear the local recovery record.');
}
// Watch matches Social's video-first tap-to-pause design: no bulky control dashboard.
assert.ok(watch.includes('function renderHostedPlayer(show,si,ep,saved,stage,renderId)'), 'Watch must keep its dedicated hosted-video player.');
assert.ok(watch.includes('className=\\'watch-video-stage watch-social-player\\''), 'Watch hosted videos must use the clean Social-style player surface.');
assert.ok(watch.includes("className='watch-slim-controls'"), 'Watch must use one lightweight floating control bar.');
for (const control of ['play','seek','time','sound','fullscreen']){
 assert.ok(watch.includes('data-control="'+control+'"'), 'Simple player is missing the '+control+' control.');
}
for (const retired of ['watch-video-controls','data-control="rate"','data-control="pip"','data-control="back"','data-control="forward"','data-control="native"']){
 assert.ok(!watch.includes(retired), 'Old bulky playback control was not removed: '+retired);
}
assert.ok(watch.includes("video.controls=false;video.muted=false;video.defaultMuted=false;video.volume=1"), 'Watch must start with the audio unmuted and full volume like Social.');
assert.ok(watch.includes("video.addEventListener('click',toggle)")&&watch.includes("overlay.addEventListener('click',toggle)"), 'Tapping the video must pause/play instead of showing a second toolbar.');
assert.ok(watch.includes("if(!video.paused&&!video.ended){video.pause();return}"), 'Tapping while playing must pause immediately.');
assert.ok(watch.includes("video.currentTime=Number(seek.value)/1000*video.duration"), 'Seek timeline must control the actual media playback position.');
assert.ok(watch.includes('frame.requestFullscreen()'), 'Fullscreen control must remain functional.');
assert.ok(watch.includes('retry.addEventListener(\\'click\\',retryPlayback)'), 'Failed secure video loads must offer an actual retry action.');
assert.ok(watch.includes("video.removeAttribute('src')")&&watch.includes("if(videoControlsCleanup){videoControlsCleanup()"), 'Changing an episode must stop and release the previous media stream.');
assert.ok(watch.includes('renderId===youtubeRender&&frame.isConnected'), 'Old secure playback responses must not restart removed players.');
assert.ok(watch.includes("getB2PlaybackUrl(saved.watch_url)"), 'B2 media URLs must remain securely signed.');
assert.ok(watch.includes("if(saved.provider==='B2 Storage')fetchSource().catch(()=>{});"), 'Watch must prefetch only a signed URL, not video bytes, to improve unmuted iPad playback gestures.');
assert.ok(watch.includes('controls=1&disablekb=0'), 'Official publisher YouTube embeds must preserve native controls.');
assert.ok(mediaWorker.includes('async function reconcileReadyObject(env: Env, row: MediaRow)') && mediaWorker.includes('async function markUploadReady(env: Env, row: MediaRow)'), 'Media Worker must recover completed B2 uploads and treat part cleanup as nonfatal.');
assert.ok(mediaWorker.includes('parts[2] === "status"') && mediaWorker.includes('id: row.id, status: recovered ? "ready" : row.status'), 'Owner must be able to check and recover the state of their own upload.');
assert.ok(mediaWorker.includes('if (await reconcileReadyObject(env, row))'), 'Replaying completion must be idempotent for already stored videos.');
assert.ok(watch.includes('id="checkWatchHosting"')&&watch.includes('id="recoverHostedUpload"'), 'Watch must expose a hosting health check and owner recovery action.');
assert.ok(watch.includes('async function watchTransferStatus(id)')&&watch.includes('PENDING_WATCH_TRANSFER'), 'Watch must preserve a failed completion reference for recovery.');
assert.ok(watch.includes("phase!=='finishing the B2 upload'"), 'Uncertain completion must not immediately abort a potentially completed upload.');
assert.ok(watch.includes('await saveEpisodeVideoRow(\'B2 Storage\',url,target)') && watch.includes('clearPendingTransfer(target,id)'), 'Recovered uploads must attach to the chosen episode and clear the pending record only after saving.');
// Execute the actual Worker JSON/CORS helpers, not just a string assertion.
// In JavaScript, {...new Headers()} drops every CORS header despite an HTTP 201.
const jsonStart=mediaWorker.indexOf('function json(data: unknown,');
const jsonEnd=mediaWorker.indexOf('async function isSiteOwner(',jsonStart);
assert.ok(jsonStart>=0&&jsonEnd>jsonStart,'Worker JSON and CORS functions must exist.');
const isolatedHelpers=mediaWorker.slice(jsonStart,jsonEnd)
  .replace('data: unknown','data')
  .replace('headers: HeadersInit = {}','headers = {}')
  .replace('request: Request, env: Env','request, env');
const exposed=vm.runInNewContext(isolatedHelpers+';({json,cors})',{Headers,Response,Request});
const allowedOrigin='https://allinoneedition.vercel.app';
const request=new Request('https://media.example/uploads/initiate',{method:'POST',headers:{Origin:allowedOrigin}});
const corsHeaders=exposed.cors(request,{APP_ORIGIN:allowedOrigin});
assert.ok(corsHeaders instanceof Headers,'CORS header helper must produce Headers.');
const created=exposed.json({uploadId:'test-upload'},201,corsHeaders);
assert.equal(created.status,201,'Upload initiation response must retain its HTTP 201.');
assert.equal(created.headers.get('access-control-allow-origin'),allowedOrigin,'Upload response must expose CORS origin so Safari can read the upload ID.');
assert.match(created.headers.get('access-control-allow-headers')||'',/Authorization/,'Upload response must expose allowed request headers.');
assert.equal(created.headers.get('cache-control'),'no-store');
assert.match(created.headers.get('content-type')||'',/application\/json/);
const errorResponse=exposed.json({error:'Authentication required'},401,corsHeaders);
assert.equal(errorResponse.headers.get('access-control-allow-origin'),allowedOrigin,'Error responses must also carry CORS or browsers will disguise errors as network failures.');
const unauthorized=exposed.json({error:'Origin not allowed'},403,exposed.cors(new Request('https://media.example/uploads/initiate',{headers:{Origin:'https://malicious.invalid'}}),{APP_ORIGIN:allowedOrigin}));
assert.equal(unauthorized.headers.get('access-control-allow-origin'),null,'Other origins must not gain CORS access.');
console.log('Owner Studio, AI Video Studio, Watch and game-library preservation contracts passed.');
