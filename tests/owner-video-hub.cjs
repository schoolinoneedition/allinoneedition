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
assert.ok(index.includes('<strong>Huge game library</strong>')&&index.includes('<strong>Quick picks</strong>'),'Keep the original game catalogue layout, not the redesigned one.');
const start=index.indexOf('const GAMES=')+'const GAMES='.length,end=index.indexOf(';const EXTRA_',start);
assert.ok(start>12&&end>start,'The original GAMES list must remain valid.');
const games=JSON.parse(index.slice(start,end));
assert.ok(games.length>=875,'The original game registry must stay intact.');
for(const title of ['Shy Safari','3x3 +1 Keyboard Escape','3x3 Steal an Egg'])assert.ok(games.some(game=>game.name===title),'Missing original game '+title);
assert.ok(index.includes('</textarea><iframe id="codePreview"')&&!index.slice(0,index.indexOf('</main>')).includes('</body>'),'Code Lab must not close the document before later sections.');
assert.ok(index.includes('href="/video"')&&index.includes('href="/anime"')&&index.includes('id="aio-feature-hub"'),'Homepage must focus Video Studio and Watch.');
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

console.log('Owner Studio, AI Video Studio, Watch and game-library preservation contracts passed.');
