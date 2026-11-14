/* Optional private GPU streaming host readiness panel.
   Server-side health checks cannot launch a game or grant a desktop session. */
(() => {
 'use strict';
 const root=document.getElementById('cloud-gaming');
 const grid=root?.querySelector('.aio-cloud-grid');
 if(!root||!grid||document.getElementById('aioCloudHostPanel'))return;
 const el=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const panel=el('section','aio-cloud-host-panel');
 panel.id='aioCloudHostPanel';
 const header=el('div','aio-cloud-host-head');
 const heading=el('div','aio-cloud-host-title');
 const mark=el('span','aio-cloud-host-kicker','PRIVATE GPU STREAMING');
 const title=el('h3','', 'In-site cloud host');
 const help=el('p','aio-cloud-host-explainer','A dedicated GPU computer can stream supported applications into a browser. Render can host a control service but not the game GPU. A self-hosted Selkies desktop is one possible streaming engine.');
 heading.append(mark,title,help);
 const check=document.createElement('button');
 check.type='button';check.className='btn mini';check.textContent='Check GPU server';
 header.append(heading,check);
 const state=el('div','aio-cloud-host-state','Checking whether an authorised GPU host is connected…');
 state.setAttribute('role','status');
 state.setAttribute('aria-live','polite');
 const note=el('p','aio-cloud-host-note','Game streaming stays unavailable until an actual GPU host, secure per-user sessions and game compatibility are verified. No game-account password is requested or stored here.');
 panel.append(header,state,note);
 grid.before(panel);

 let requestNumber=0,pending=null;
 const describe=report=>{
  if(!report||typeof report!=='object')return 'Host status is unavailable.';
  switch(report.state){
   case 'not_configured':return 'No dedicated GPU host connected. The in-site game library still works.';
   case 'host_online':return report.gpuDetected===true
     ?'GPU host responded, but a secure playable session has not been connected.'
     :'Host responded, but it did not confirm a working GPU.';
   case 'unverified_host':return 'A server responded, but it was not verified as a game host.';
   case 'host_unreachable':return 'GPU host is unreachable. No cloud session has started.';
   case 'invalid_config':return 'GPU host setup needs fixing before it can be checked.';
   default:return 'Dedicated cloud host is not ready.';
  }
 };
 async function checkHost(){
  const seq=++requestNumber;
  pending?.abort?.();
  const controller=new AbortController();pending=controller;
  check.disabled=true;
  state.textContent='Checking the configured GPU host…';
  try{
   const timeout=setTimeout(()=>controller.abort(),5200);
   try{
    const response=await fetch('/api/cloud-host-status',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
    if(!response.ok)throw Error('status failed');
    const report=await response.json();
    if(seq!==requestNumber)return;
    state.textContent=describe(report);
    state.dataset.cloudState=String(report.state||'unknown');
   }finally{clearTimeout(timeout)}
  }catch{
   if(seq!==requestNumber)return;
   state.textContent='Unable to check the GPU host. Existing browser games are unaffected.';
   state.dataset.cloudState='check_error';
  }finally{
   if(seq===requestNumber){pending=null;check.disabled=false}
  }
 }
 check.addEventListener('click',checkHost);
 checkHost();
 window.aioCloudHost={refresh:checkHost,describe};
})();
