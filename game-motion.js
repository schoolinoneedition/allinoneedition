/* Progressive game-card motion and accessible loading visuals. Does not modify game data. */
(()=>{
 'use strict';
 const grid=document.getElementById('gameGrid');
 const frameLoader=document.getElementById('gameLoading');
 const modal=document.getElementById('gameModal');
 const siteLoader=document.getElementById('siteLoader');
 if(!grid||!frameLoader||!modal)return;
 const bootLine=siteLoader?.querySelector?.('.aio-launch-status');
 function updateBootStatus(){
  if(!bootLine)return;
  if(siteLoader?.classList.contains('done')){bootLine.textContent='Game hub ready';return}
  const hasGames=Boolean(grid.querySelectorAll?.(':scope > .card')?.length);
  bootLine.textContent=hasGames?'Game catalogue ready · Opening the hub':'Preparing your game catalogue…';
 }
 updateBootStatus();
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const root=document.documentElement;
 const style=document.createElement('link');
 style.rel='stylesheet';style.href='/game-motion.css';
 document.head.appendChild(style);

 // Let browser history restoration skip stale, previously completed splash screens.
 const revealSite=()=>{
  if(siteLoader?.classList.contains('done'))root.classList.add('aio-site-ready');
  updateBootStatus();
 };
 if(siteLoader){
  const siteObserver=new MutationObserver(revealSite);
  siteObserver.observe(siteLoader,{attributes:true,attributeFilter:['class']});
  revealSite();
  window.addEventListener('pageshow',event=>{
   if(event.persisted){
    siteLoader.classList.add('done');
    siteLoader.setAttribute('aria-hidden','true');
    revealSite();
   }
  });
 }

 // Only animate cards when they enter the viewport; the real game grid remains intact.
 const animationsAllowed=()=>!reduced?.matches&&root.dataset.aioPerformanceProfile!=='lite';
 let visibleObserver=null,paintQueued=false;
 const observed=new Set();
 const gridObserver=new MutationObserver(()=>{
  if(paintQueued)return;
  paintQueued=true;
  requestAnimationFrame(()=>{paintQueued=false;observeCards();updateBootStatus()});
 });
 function disposeObserver(){
  visibleObserver?.disconnect();visibleObserver=null;
  for(const item of observed){item.classList.remove('aio-reveal-card','aio-in-view');item.style.removeProperty('--aio-stagger')}
  observed.clear();
 }
 function observeCards(){
  if(!('IntersectionObserver' in window)||!animationsAllowed()){
   disposeObserver();return;
  }
  if(!visibleObserver){
   visibleObserver=new IntersectionObserver(entries=>{
    for(const entry of entries)entry.target.classList.toggle('aio-in-view',entry.isIntersecting);
   },{rootMargin:'22px 0px -8px 0px',threshold:0.01});
  }
  for(const item of [...observed])if(!grid.contains(item)){
   visibleObserver.unobserve(item);observed.delete(item);
  }
  const cards=grid.querySelectorAll(':scope > .card');
  for(let i=0;i<cards.length;i++){
   const card=cards[i];
   if(observed.has(card))continue;
   card.style.setProperty('--aio-stagger',Math.min(i%6,5)*30+'ms');
   card.classList.add('aio-reveal-card');
   observed.add(card);
   visibleObserver.observe(card);
  }
 }
 gridObserver.observe(grid,{childList:true});
 observeCards();
 updateBootStatus();
 reduced?.addEventListener?.('change',observeCards);
 let lastScroll=window.scrollY,scrollDirection='';
 window.addEventListener('scroll',()=>{
  const y=window.scrollY,d=y-lastScroll;
  if(Math.abs(d)<7)return;
  const next=d<0?'up':'down';lastScroll=y;
  if(next!==scrollDirection){scrollDirection=next;root.dataset.aioScrollDirection=next}
 },{passive:true});

 // The loader is independent of the iframe: it never invents percentage progress.
 frameLoader.classList.add('aio-game-loader');
 frameLoader.setAttribute('role','status');
 frameLoader.setAttribute('aria-live','polite');
 const inner=document.createElement('div');
 inner.className='aio-game-loading-inner';
 const logo=document.createElement('div');logo.className='aio-game-loader-logo';
 logo.setAttribute('aria-hidden','true');
 for(let i=0;i<4;i++)logo.appendChild(document.createElement('i'));
 const heading=document.createElement('strong');heading.className='aio-game-loader-heading';
 heading.textContent='Preparing your game';
 const message=document.createElement('span');message.className='aio-game-loader-desc';message.textContent='Connecting to the game host…';
 const track=document.createElement('div');track.className='aio-game-loader-track';track.setAttribute('aria-hidden','true');
 inner.append(logo,heading,message,track);
 frameLoader.replaceChildren(inner);
 let loading=false,timeouts=[];
 const clearMessages=()=>{timeouts.forEach(clearTimeout);timeouts=[]};
 function syncGameLoading(){
  const isLoading=modal.classList.contains('open')&&frameLoader.style.display!=='none';
  if(!isLoading){if(loading){loading=false;clearMessages()}return}
  if(loading)return;
  loading=true;heading.textContent='Preparing your game';message.textContent='Connecting to the game host…';
  clearMessages();
  timeouts.push(setTimeout(()=>{
   if(loading)message.textContent='The game is opening. Some hosts take a little longer.';
  },3500));
  timeouts.push(setTimeout(()=>{
   if(loading)message.textContent='Still connecting. You can use Reload if the game does not respond.';
  },8000));
 }
 const activityObserver=new MutationObserver(syncGameLoading);
 activityObserver.observe(modal,{attributes:true,attributeFilter:['class']});
 activityObserver.observe(frameLoader,{attributes:true,attributeFilter:['style']});
 syncGameLoading();
 window.addEventListener('pagehide',()=>{clearMessages();activityObserver.disconnect();gridObserver.disconnect();visibleObserver?.disconnect()});

 window.aioGameMotion={refresh:observeCards,enabled:animationsAllowed};
})();
