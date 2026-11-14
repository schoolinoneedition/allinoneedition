/* Owner-only, explicit-action Vagon embedded stream. No automated purchases. */
(()=>{
 'use strict';
 const root=document.getElementById('cloud-gaming');
 const grid=root?.querySelector('.aio-cloud-grid');
 if(!grid||document.getElementById('aioEmbeddedStream'))return;
 const make=(tag,cls,content)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(content!==undefined)node.textContent=content;
  return node;
 };
 const panel=make('section','aio-embedded-stream');
 panel.id='aioEmbeddedStream';
 const heading=make('div','aio-embedded-header');
 const headingText=make('div','');
 const title=make('h3','','Play streamed apps here');
 const sub=make('p','','An approved GPU stream can run inside All in One Edition. Fortnite and Roblox are not verified for this service.');
 headingText.append(title,sub);
 const state=make('span','aio-embedded-state','Checking connection…');
 state.setAttribute('role','status');
 state.setAttribute('aria-live','polite');
 heading.append(headingText,state);
 const options=make('div','aio-embedded-options');
 const consent=make('label','aio-embedded-consent');
 const checkbox=make('input','');
 checkbox.type='checkbox';
 const consentLabel=make('span','','I understand starting a hosted stream may incur charges on the provider account.');
 consent.append(checkbox,consentLabel);
 const controls=make('div','aio-embedded-controls');
 const start=make('button','btn primary','Start in-site stream');
 start.type='button';
 const retry=make('button','btn mini','Check host');
 retry.type='button';
 const fullscreen=make('button','btn mini','Fullscreen');
 fullscreen.type='button';fullscreen.hidden=true;
 const close=make('button','btn mini','Stop viewing');
 close.type='button';close.hidden=true;
 controls.append(start,retry,fullscreen,close);
 options.append(consent,controls);
 const viewer=make('div','aio-embedded-viewer');viewer.hidden=true;
 const hint=make('p','aio-embedded-notice','No gaming PC or paid stream starts just by opening this page. Closing the player may not stop provider billing. Use a provider-side session limit.');
 panel.append(heading,options,viewer,hint);
 grid.before(panel);

 let frame=null,seq=0,abort=null,frameTimer=0;
 function update(text,status){
  state.textContent=text;
  state.dataset.state=status||'';
 }
 function resetFrame(){
  clearTimeout(frameTimer);
  if(frame){frame.src='about:blank';frame.remove();frame=null}
  viewer.replaceChildren();viewer.hidden=true;
  close.hidden=true;fullscreen.hidden=true;
 }
 async function getConfig(withAuth){
  const controller=new AbortController();
  abort?.abort();abort=controller;
  const timeout=setTimeout(()=>controller.abort(),5000);
  try{
   const headers={};
   if(withAuth){
    const client=typeof supabaseClient!=='undefined'?supabaseClient:null;
    const auth=await client?.auth?.getSession?.();
    if(!auth?.data?.session?.access_token||auth.error)
     return {state:'signin_required',message:'Sign into your All in One Edition owner account first.'};
    headers.Authorization='Bearer '+auth.data.session.access_token;
   }
   const response=await fetch('/api/cloud-stream-session',{method:'GET',credentials:'same-origin',cache:'no-store',headers,signal:controller.signal});
   return await response.json();
  }catch{return {state:'unavailable',message:'Could not reach the stream session service.'}}
  finally{clearTimeout(timeout);if(abort===controller)abort=null}
 }
 async function check(){
  const id=++seq;
  retry.disabled=true;
  update('Checking the private stream configuration…','checking');
  const result=await getConfig(false);
  if(id!==seq)return;
  retry.disabled=false;
  if(result.state==='not_configured')update('No approved GPU stream is connected yet.','not_configured');
  else if(result.state==='signin_required')update('Stream configured · Owner sign-in required','signin_required');
  else update('Stream status unavailable. Use Check host to retry.','unavailable');
 }
 function validVagonUrl(raw){
  try{
   const url=new URL(raw);
   return url.protocol==='https:'&&!url.port&&!url.username&&!url.password
    &&!url.search&&!url.hash
    &&((url.hostname==='app.vagon.io'&&/^\/stream\/[a-z0-9_-]{8,128}\/?$/i.test(url.pathname))
     ||(url.hostname==='streams.vagon.io'&&/^\/streams\/[a-z0-9_-]{8,128}\/?$/i.test(url.pathname)))
    ?url.href:null;
  }catch{return null}
 }
 async function open(){
  if(!checkbox.checked){update('Confirm the possible provider usage charges before starting.','consent');return}
  const id=++seq;
  start.disabled=true;retry.disabled=true;
  update('Checking your owner account and GPU stream…','connecting');
  const result=await getConfig(true);
  if(id!==seq)return;
  start.disabled=false;retry.disabled=false;
  if(result.state!=='ready'||typeof result.embedUrl!=='string'){
   update(result.message||'Stream is not available.',result.state||'unavailable');return;
  }
  const url=validVagonUrl(result.embedUrl);
  if(!url){update('The server supplied an unsupported stream address.','invalid_url');return}
  resetFrame();
  frame=make('iframe','aio-embedded-frame');
  frame.id='vagonFrame';
  frame.title='Private GPU stream inside All in One Edition';
  frame.allow='autoplay; fullscreen; gamepad; microphone; clipboard-read; clipboard-write; encrypted-media';
  frame.allowFullscreen=true;
  frame.referrerPolicy='no-referrer';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock');
  const thisFrame=frame;
  frame.addEventListener('load',()=>{
   if(frame!==thisFrame)return;
   clearTimeout(frameTimer);
   update('Stream page opened here. Gameplay and compatibility must be checked in the player.','frame_open');
  });
  frame.addEventListener('error',()=>{
   if(frame!==thisFrame)return;
   clearTimeout(frameTimer);
   update('The provider could not open inside this site. Check its embed settings.','frame_error');
  });
  // Set src before insertion so the initial empty iframe navigation is not
  // mistaken for the provider loading successfully.
  frame.src=url;
  viewer.replaceChildren(frame);viewer.hidden=false;
  close.hidden=false;fullscreen.hidden=false;
  update('Opening private stream inside All in One Edition…','opening');
  frameTimer=setTimeout(()=>{
   if(frame===thisFrame)update('Connection is taking too long. Check the provider or stop viewing.','timeout');
  },18000);
  viewer.scrollIntoView?.({block:'nearest',behavior:'smooth'});
 }
 function stop(){
  ++seq;abort?.abort();abort=null;
  resetFrame();
  start.disabled=false;retry.disabled=false;
  update('Stream viewer closed. Provider session billing may continue until its own timeout.','closed');
 }
 start.addEventListener('click',open);
 retry.addEventListener('click',check);
 close.addEventListener('click',stop);
 fullscreen.addEventListener('click',async()=>{
  if(!frame)return;
  try{
   await viewer.requestFullscreen?.();
   frame.focus?.();
  }catch{update('Fullscreen is unavailable. The stream stays on this page.','fullscreen_error')}
 });
 window.addEventListener('pagehide',()=>{stop();},{once:true});
 check();
 window.aioEmbeddedStream={check,stop,validVagonUrl};
})();
