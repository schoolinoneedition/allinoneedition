'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('cloud-embedded-stream.js','utf8');
class El{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.listeners={};this.hidden=false;this.disabled=false;this.textContent='';}
 append(...els){this.children.push(...els)}
 replaceChildren(...els){this.children=[...els]}
 before(x){this.inserted=x}
 setAttribute(name,value){this[name]=value}
 addEventListener(name,fn){this.listeners[name]=fn}
 remove(){this.removed=true}
 scrollIntoView(){this.scrolled=true}
}
const root=new El('section'),grid=new El('div');
root.querySelector=sel=>sel==='.aio-cloud-grid'?grid:null;
const owner='123e4567-e89b-42d3-a456-426614174000';
const good='https://app.vagon.io/stream/stream_12345';
const calls=[];
const ctx={
 document:{getElementById:id=>id==='cloud-gaming'?root:null,createElement:tag=>new El(tag)},
 window:{addEventListener(){}},
 supabaseClient:{auth:{getSession:async()=>({data:{session:{access_token:'test-token'}}})}},
 fetch:async(uri,opts)=>{
  calls.push({uri,opts});
  return {json:async()=>opts.headers.Authorization?
   {state:'ready',embedUrl:good}:
   {state:'signin_required'}};
 },
 AbortController,setTimeout:()=>1,clearTimeout:()=>{}
};
vm.runInNewContext(src,ctx);
async function main(){
 await new Promise(resolve=>setImmediate(resolve));
 const panel=grid.inserted;
 assert.ok(panel,'Must mount within Cloud Gaming section');
 const heading=panel.children[0],state=heading.children[1];
 const options=panel.children[1],consent=options.children[0],controls=options.children[1],viewer=panel.children[2];
 const [start,retry,fullscreen,close]=controls.children;
 assert.match(state.textContent,/Owner sign-in required/);
 assert.equal(viewer.hidden,true,'Never autostart a billed stream');
 await start.listeners.click();
 assert.match(state.textContent,/Confirm the possible provider usage charges/);
 assert.equal(viewer.children.length,0);
 consent.children[0].checked=true;
 await start.listeners.click();
 assert.equal(viewer.hidden,false);
 assert.equal(viewer.children.length,1);
 const frame=viewer.children[0];
 assert.equal(frame.id,'vagonFrame');
 assert.equal(frame.src,good);
 assert.match(frame.sandbox,/allow-scripts/);
 assert.match(frame.allow,/gamepad/);
 assert.equal(calls[calls.length-1].opts.headers.Authorization,'Bearer test-token');
 frame.listeners.load();
 assert.match(state.textContent,/Stream page opened/);
 close.listeners.click();
 assert.equal(viewer.hidden,true);
 assert.equal(viewer.children.length,0);
 assert.equal(fullscreen.hidden,true);
 assert.equal(ctx.window.aioEmbeddedStream.validVagonUrl('https://evil.test/stream/123456789'),null);
 assert.equal(ctx.window.aioEmbeddedStream.validVagonUrl(good),good);
 ctx.fetch=async()=>({json:async()=>({state:'ready',embedUrl:'https://evil.test/stream/123456789'})});
 await start.listeners.click();
 assert.match(state.textContent,/unsupported stream address/);
 assert.equal(viewer.hidden,true);
 assert.doesNotMatch(src,/window\.open|target\s*=\s*['"]_blank/);
 console.log('Embedded GPU client passed: no auto-billing, explicit charge consent, signed-in owner, allowlisted Vagon iframe, stop and invalid-URL blocking.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
