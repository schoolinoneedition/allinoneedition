'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const index=read('index.html'),owner=read('owner.html'),video=read('video.html'),watch=read('anime.html'),worker=read('cloudflare/elementor-ai/worker.ts'),backend=read('backend-features.js');
const routes=JSON.parse(read('vercel.json')).rewrites;
assert.ok(!fs.existsSync(path.join(root,'game-catalogue.css')),'Broken catalogue override must remain removed.');
assert.ok(index.includes('id="gameGrid"')&&index.includes('id="filters"')&&index.includes('<strong>Quick picks</strong>'),'Restore the original catalogue, including its original Quick picks section.');
assert.ok(index.includes('id="unifiedGameSearch"')&&index.indexOf('id="unifiedGameSearch"')<index.indexOf('<main id="app">'),'Search must be in the original topbar.');
assert.ok(index.includes('class="aio-launch-symbol"')&&index.includes('MIN_VISIBLE_MS=7500'),'The requested rolling-logo loading screen must stay in place.');
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
  if(/\bsrc\s*=/.test(m[1]))continue;
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
assert.ok(index.includes("classList.toggle('aio-3x3-direct',isThreeByThree)")&&index.includes("classList.remove('aio-3x3-direct')"),'Only apply the 3x3 host-toolbar crop while a direct 3x3 game is open.');
assert.ok(index.includes('#gameModal.open.aio-3x3-direct #gameFrame')&&index.includes('clip-path:polygon('),'Keep the hidden third-party toolbar without changing the original player interface.');
assert.ok(index.includes('async function loadGameIntoFrame(g)')&&index.includes("select('html_content')"),'Uploaded HTML game playback must survive the UI rollback.');
assert.ok(!index.includes('id="aio-feature-hub"'),'The new video-first homepage redesign must stay reverted.');

console.log('Owner Studio, AI Video Studio, Watch and game-library preservation contracts passed.');
