/* Optional GPU-streamed public game demos, launched inside the AIO page.
   Streams are supplied by Eagle 3D Streaming's officially published demos.
   This script does NOT operate a GPU VM, promise game availability, or launch Roblox/Fortnite. */
(()=>{
 'use strict';
 const root=document.getElementById('cloud-gaming');
 const grid=root?.querySelector('.aio-cloud-grid');
 if(!grid||document.getElementById('aioFreeCloudDemo'))return;
 const DEMOS=Object.freeze({
  chop:{
   name:'Chop Chop',
   subtitle:'Unity game demo streamed from a remote GPU',
   url:'https://stream.eagle3dstreaming.com/v5/demo/E3DS_ChopChop_v6/Project_E3DS_ChopChop_v6'
  },
  world:{
   name:'Interactive 3D world',
   subtitle:'Unreal Engine remote-rendering demo',
   url:'https://connector.eagle3dstreaming.com/v5/demo/DemoAppTP/default'
  }
 });
 const make=(tag,cls,text)=>{
  const element=document.createElement(tag);
  if(cls)element.className=cls;
  if(text!==undefined)element.textContent=text;
  return element;
 };
 const section=make('section','aio-free-cloud');
 section.id='aioFreeCloudDemo';
 section.setAttribute('aria-labelledby','aioFreeCloudTitle');
 const head=make('div','aio-free-cloud-head');
 const heading=make('div','aio-free-cloud-title');
 const kicker=make('span','aio-free-cloud-kicker','LIVE GPU-STREAMED DEMOS');
 const title=make('h3','','Try a real cloud-streamed game');
 title.id='aioFreeCloudTitle';
 const description=make('p','','These official public demos render on Eagle 3D Streaming GPU machines, not your device. Shared demo capacity is limited; a queue or provider outage is possible.');
 heading.append(kicker,title,description);
 const status=make('p','aio-free-cloud-status','Choose a demo. Nothing starts until you press Play.');
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 head.append(heading,status);
 const choices=make('div','aio-free-cloud-choices');
 const buttons={};
 for(const [id,demo] of Object.entries(DEMOS)){
  const button=make('button','aio-free-cloud-choice');
  button.type='button';
  button.dataset.demoId=id;
  const name=make('strong','',demo.name);
  const detail=make('span','',demo.subtitle);
  button.append(name,detail);
  button.setAttribute('aria-label','Play '+demo.name+' inside All in One Edition');
  buttons[id]=button;
  choices.appendChild(button);
 }
 const viewer=make('div','aio-free-cloud-viewer');
 viewer.hidden=true;
 const toolbar=make('div','aio-free-cloud-toolbar');
 const playing=make('strong','','Cloud demo');
 const controls=make('div','aio-free-cloud-controls');
 const fullscreen=make('button','btn mini','Fullscreen');
 fullscreen.type='button';
 const stop=make('button','btn mini','Stop demo');
 stop.type='button';
 controls.append(fullscreen,stop);
 toolbar.append(playing,controls);
 const stage=make('div','aio-free-cloud-stage');
 const loadState=make('div','aio-free-cloud-wait');
 const loadLabel=make('span','','Requesting a shared demo machine…');
 const loadTrack=make('div','aio-free-cloud-track');
 loadTrack.setAttribute('aria-hidden','true');
 loadState.append(loadLabel,loadTrack);
 stage.appendChild(loadState);
 viewer.append(toolbar,stage);
 const disclaimer=make('p','aio-free-cloud-disclaimer',
  'Provider: Eagle 3D Streaming. These are public showcase demos, not your own unlimited GPU or a Roblox/Fortnite session. Stop the demo when finished; the provider may take time to release its GPU. Click inside the stream for keyboard controls.');
 section.append(head,choices,viewer,disclaimer);
 grid.before(section);
 let frame=null,active='',serial=0,timers=[];
 function clearTimers(){for(const id of timers)clearTimeout(id);timers=[]}
 function setStatus(text,state){status.textContent=text;status.dataset.state=state||'idle'}
 function queueTimeout(callback,ms){timers.push(setTimeout(callback,ms))}
 function stopDemo(){
  serial++;
  clearTimers();
  if(frame){frame.src='about:blank';frame.remove();frame=null}
  stage.replaceChildren(loadState);
  viewer.hidden=true;
  active='';
  for(const b of Object.values(buttons)){b.disabled=false;b.setAttribute('aria-pressed','false')}
  loadState.hidden=true;
  setStatus('Stream viewer closed. The provider may take time to release its GPU session.','closed');
 }
 function startDemo(id){
  if(!Object.prototype.hasOwnProperty.call(DEMOS,id))return false;
  if(frame)stopDemo();
  const demo=DEMOS[id],run=++serial;
  active=id;
  for(const [key,b] of Object.entries(buttons)){b.disabled=key===id;b.setAttribute('aria-pressed',String(key===id))}
  playing.textContent=demo.name+' · cloud GPU demo';
  setStatus('Connecting to '+demo.name+' on a shared GPU…','connecting');
  loadLabel.textContent='Connecting to a real streaming server…';
  loadState.hidden=false;
  const next=make('iframe','aio-free-cloud-frame');
  next.title=demo.name+' streamed through Eagle 3D Streaming';
  next.allow='autoplay; fullscreen; gamepad; encrypted-media';
  next.allowFullscreen=true;
  next.referrerPolicy='no-referrer';
  // The provider operates its own origin. Do not proxy its login, stream or private APIs.
  next.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups');
  next.addEventListener('load',()=>{
   if(frame!==next||run!==serial)return;
   loadState.hidden=true;
   if(status.dataset.state==='connecting')
    setStatus('Provider page opened. Press Play there if prompted; the remote GPU may still be starting.','page_open');
  });
  next.addEventListener('error',()=>{
   if(frame!==next||run!==serial)return;
   loadState.hidden=true;
   setStatus('The provider page failed to open. Try the other cloud demo.','error');
  });
  next.src=demo.url;
  frame=next;
  stage.replaceChildren(next,loadState);
  viewer.hidden=false;
  queueTimeout(()=>{
   if(run!==serial)return;
   loadState.hidden=true;
   if(!['playing','ready','ended'].includes(status.dataset.state))
    setStatus('Still waiting for shared GPU capacity. Check the provider view or try the other demo.','waiting');
  },30000);
  // A courtesy limit to avoid holding provider-owned free demo GPU slots indefinitely.
  queueTimeout(()=>{
   if(run!==serial)return;
   stopDemo();
   setStatus('The demo time limit (10 minutes) was reached. Start a new session to retry.','limit');
  },600000);
  viewer.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',block:'nearest'});
  return true;
 }
 function processMessage(event){
  if(!frame||!active||event.source!==frame.contentWindow)return;
  const expected=new URL(DEMOS[active].url);
  if(event.origin!==expected.origin)return;
  let data=event.data;
  if(typeof data==='string'){
   if(data.length>2048)return;
   try{data=JSON.parse(data)}catch{return}
  }
  if(!data||typeof data!=='object')return;
  const type=String(data.type||'');
  switch(type){
   case 'stage1_inqueued':
   case 'QueueNumberUpdated':{
    const candidate=Number(data.queuePosition??data.positionInQueue);
    const position=Number.isInteger(candidate)&&candidate>=1&&candidate<=999?' · Position '+candidate:'';
    setStatus('Waiting for an available streaming GPU'+position,'queued');
    break;
   }
   case 'stage2_deQueued':
   case 'stage3_slotOccupied':
   case 'stage3_1_AppAcquiringProgress':
   case 'stage3_2_AppPreparationProgress':
    setStatus('GPU assigned. The provider is preparing the game…','preparing');
    break;
   case 'stage4_playBtnShowedUp':
    loadState.hidden=true;
    setStatus('Stream is ready. Click Play inside the game window.','ready');
    break;
   case 'stage5_playBtnPressed':
   case 'bidirectionalChannelBetweenUnrealAndIframeReady':
    loadState.hidden=true;
    setStatus('Remote stream started. Click the game window to focus controls.','playing');
    break;
   case 'sessionExpired':
   case 'sessionEnding':
   case 'handleStreamerDisconnected':
    loadState.hidden=true;
    setStatus('The provider ended this GPU session. Stop and restart to try again.','ended');
    break;
  }
 }
 window.addEventListener('message',processMessage);
 choices.addEventListener('click',event=>{
  const id=event.target?.closest?.('[data-demo-id]')?.dataset.demoId;
  if(id)startDemo(id);
 });
 stop.addEventListener('click',stopDemo);
 fullscreen.addEventListener('click',async()=>{
  if(!frame)return;
  try{await stage.requestFullscreen();frame.focus?.()}
  catch{setStatus('Fullscreen was blocked. The stream stays inside All in One Edition.','fullscreen_error')}
 });
 window.addEventListener('pagehide',()=>{if(frame)stopDemo()},{once:true});
 window.aioFreeCloudDemo={start:startDemo,stop:stopDemo,active:()=>active,allowlisted:id=>Object.prototype.hasOwnProperty.call(DEMOS,id)};
})();
