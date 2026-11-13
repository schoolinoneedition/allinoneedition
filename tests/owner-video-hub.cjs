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
for(const title of ['Shy Safari','Times Tables Speed Escape','Steal an Egg 3x3'])assert.ok(games.some(game=>game.name===title),'Missing original game '+title);
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
console.log('Owner Studio, AI Video Studio, Watch and game-library preservation contracts passed.');
