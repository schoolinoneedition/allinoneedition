/* First-party games that actually run inside All in One Edition.
   They are browser games, NOT cloud-hosted Fortnite or Roblox sessions. */
(() => {
 'use strict';
 const root=document.getElementById('cloud-gaming');
 const cloudCards=root?.querySelector('.aio-cloud-grid');
 if(!root||!cloudCards||document.getElementById('aio-in-site-play'))return;

 // Explicit allowlist: every URL is first-party, checked into our repository.
 const originals=Object.freeze([
  {id:'meteor',title:'Meteor Drift',kind:'Arcade',hint:'Move with the arrow keys or drag.'},
  {id:'tower',title:'Tower Timing',kind:'Skill',hint:'Tap or press Space to stack blocks.'},
  {id:'golf',title:'Pocket Putt',kind:'Sports',hint:'Drag to aim the ball.'},
  {id:'hop',title:'Skybound Hop',kind:'Platformer',hint:'Use arrows or drag to move.'},
  {id:'hockey',title:'Air Hockey Arena',kind:'Sports',hint:'Drag or use the arrow keys.'},
  {id:'blocks',title:'Block Drop',kind:'Puzzle',hint:'Use arrows or touch controls.'},
  {id:'snake',title:'Circuit Snake',kind:'Arcade',hint:'Use arrows or swipe to collect nodes and dodge your trail.',bonus:true},
  {id:'merge',title:'Merge Matrix',kind:'Puzzle',hint:'Combine equal number tiles with arrows or swipes.',bonus:true},
  {id:'orbit',title:'Orbit Dash',kind:'Survival',hint:'Dodge meteors with left/right arrows or touch.',bonus:true},
  {id:'catch',title:'Colour Catch',kind:'Skill',hint:'Catch cyan orbs, avoid red; arrows or touch.',bonus:true}
 ]);
 const allowed=id=>originals.find(game=>game.id===id)||null;
 const gameUrl=id=>{
  const game=allowed(id);
  return game?(game.bonus?'/games/bonus-arcade.html?game=':'/games/arcade-collection.html?game=')+id:null;
 };
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const key='aio-in-site-last-game-v1';
 const make=(tag,className,text)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=text;
  return el;
 };
 const makeButton=(label,className)=>{const b=make('button',className,label);b.type='button';return b};
 const section=make('section','aio-in-site-play');
 section.id='aio-in-site-play';
 section.setAttribute('aria-labelledby','aioInSiteTitle');
 const heading=make('div','aio-in-site-heading');
 const copy=make('div','aio-in-site-copy');
 const eyebrow=make('span','aio-in-site-eyebrow','PLAY HERE · NO EXTRA ACCOUNT');
 const title=make('h3','', 'Instant games in All in One Edition');
 title.id='aioInSiteTitle';
 const intro=make('p','', 'These original browser games play directly on this page. Fortnite and Roblox still require an approved game-streaming provider or a dedicated gaming PC.');
 copy.append(eyebrow,title,intro);
 const last=make('span','aio-in-site-last','Choose a game to start.');
 const tools=make('div','aio-in-site-discovery');
 const search=make('input','aio-in-site-search');
 search.type='search';search.placeholder='Find a game…';search.maxLength=60;
 search.setAttribute('aria-label','Search instant games');
 const surprise=makeButton('Surprise me','btn mini');
 surprise.title='Start a random original browser game';
 const again=makeButton('Play last','btn mini');
 again.title='Replay your last instant browser game';
 tools.append(search,surprise,again);
 heading.append(copy,last,tools);

 const picks=make('div','aio-in-site-picks');
 picks.setAttribute('role','group');
 picks.setAttribute('aria-label','Games playable here');
 for(const game of originals){
  const button=makeButton(game.title,'aio-in-site-pick');
  button.dataset.aioGame=game.id;
  const category=make('small','',game.kind);
  button.appendChild(category);
  if(game.bonus)button.appendChild(make('span','aio-in-site-new','NEW'));
  picks.appendChild(button);
 }
 const stage=make('div','aio-in-site-stage');
 stage.hidden=true;
 const toolbar=make('div','aio-in-site-toolbar');
 const name=make('strong','aio-in-site-current','');
 const actions=make('div','aio-in-site-actions');
 const reload=makeButton('Restart','btn mini');
 const fullscreen=makeButton('Fullscreen','btn mini');
 const close=makeButton('Close','btn mini');
 actions.append(reload,fullscreen,close);
 toolbar.append(name,actions);
 const viewport=make('div','aio-in-site-viewport');
 const status=make('p','aio-in-site-status','');
 status.setAttribute('role','status');
 status.setAttribute('aria-live','polite');
 const loadingView=make('div','aio-in-site-loading');
 loadingView.hidden=true;
 loadingView.setAttribute('role','status');
 loadingView.setAttribute('aria-live','polite');
 const loadingArt=make('div','aio-in-site-loading-art');
 loadingArt.setAttribute('aria-hidden','true');
 for(let i=0;i<4;i++)loadingArt.appendChild(make('span','',''));
 const loadingTitle=make('strong','','Starting your game');
 const loadingHint=make('span','aio-in-site-loading-hint','Getting the in-site player ready…');
 const loadingTrack=make('div','aio-in-site-loading-track');
 loadingTrack.setAttribute('aria-hidden','true');
 loadingView.append(loadingArt,loadingTitle,loadingHint,loadingTrack);
 stage.append(toolbar,viewport,status,loadingView);
 section.append(heading,picks,stage);
 const providerNotice=make('p','aio-in-site-provider-note',
  'Fortnite and Roblox are not playable inside this website yet. Their existing provider links below open other services and may require separate sign-in. This in-page player never sends your game password anywhere.');
 section.appendChild(providerNotice);
 cloudCards.before(section);

 let active='',loadTimer=0,frame=null;
 const stopTimer=()=>{clearTimeout(loadTimer);loadTimer=0};
 const setStatus=message=>{status.textContent=message};
 function open(id){
  const game=allowed(id);
  if(!game)return false;
  stopTimer();
  active=id;
  for(const pick of picks.querySelectorAll('[data-aio-game]')){
   const selected=pick.dataset.aioGame===id;
   pick.classList.toggle('active',selected);
   pick.setAttribute('aria-pressed',String(selected));
  }
  if(frame){frame.src='about:blank';frame.remove();frame=null}
  stage.hidden=false;
  loadingView.hidden=false;
  loadingTitle.textContent='Opening '+game.title;
  loadingHint.textContent='Loading a real browser game on this site…';
  name.textContent=game.title;
  setStatus('Opening '+game.title+' inside All in One Edition…');
  frame=make('iframe','aio-in-site-frame');
  frame.title=game.title+' · All in One Edition';
  frame.allow='fullscreen; gamepad; autoplay';
  frame.allowFullscreen=true;
  frame.referrerPolicy='same-origin';
  frame.loading='eager';
  const currentFrame=frame;
  currentFrame.addEventListener('load',()=>{
   if(frame!==currentFrame||active!==id)return;
   stopTimer();
   loadingView.hidden=true;
   setStatus(game.title+' player opened. '+game.hint);
  });
  currentFrame.addEventListener('error',()=>{
   if(frame!==currentFrame||active!==id)return;
   stopTimer();
   loadingView.hidden=true;
   setStatus('The browser could not open this game. Try Restart.');
  });
  viewport.replaceChildren(frame);
  frame.src=gameUrl(id);
  loadTimer=setTimeout(()=>{
   if(frame===currentFrame&&active===id){
    loadingView.hidden=true;
    setStatus('Still opening the game. Try Restart if it stays blank.');
   }
  },12000);
  last.textContent='Playing here: '+game.title;
  try{localStorage.setItem(key,id)}catch{}
  stage.scrollIntoView?.({behavior:reduced?'auto':'smooth',block:'nearest'});
  return true;
 }
 function stop(){
  stopTimer();
  active='';
  if(frame){frame.src='about:blank';frame.remove();frame=null}
  viewport.replaceChildren();
  stage.hidden=true;
  loadingView.hidden=true;
  for(const pick of picks.querySelectorAll('[data-aio-game]')){
   pick.classList.remove('active');pick.setAttribute('aria-pressed','false');
  }
  last.textContent='Player closed. Choose any game to start.';
 }
 picks.addEventListener('click',event=>{
  const id=event.target?.closest?.('[data-aio-game]')?.dataset.aioGame;
  if(id)open(id);
 });
 close.addEventListener('click',stop);
 reload.addEventListener('click',()=>{if(active)open(active)});
 fullscreen.addEventListener('click',async()=>{
  if(!active)return;
  if(!viewport.requestFullscreen){setStatus('Fullscreen is unavailable in this browser.');return}
  try{await viewport.requestFullscreen();frame?.focus?.()}
  catch{setStatus('Fullscreen was blocked by the browser. The game is still playable here.')}
 });
 try{
  const previous=localStorage.getItem(key),game=allowed(previous);
  if(game)last.textContent='Last played here: '+game.title;
 }catch{}
 function updateDiscovery(){
  const term=String(search.value||'').trim().toLocaleLowerCase();
  let visible=0;
  for(const pick of picks.querySelectorAll('[data-aio-game]')){
   const game=allowed(pick.dataset.aioGame);
   pick.hidden=Boolean(term)&&![game.title,game.kind,game.hint].some(text=>text.toLocaleLowerCase().includes(term));
   if(!pick.hidden)visible++;
  }
  surprise.disabled=visible===0;
  if(visible===0)last.textContent='No games match that search.';
  else if(!active&&last.textContent==='No games match that search.')last.textContent='Choose a game to start.';
 }
 search.addEventListener('input',updateDiscovery);
 surprise.addEventListener('click',()=>{
  const visible=originals.filter(game=>{
   const pick=picks.querySelectorAll('[data-aio-game]').find(button=>button.dataset.aioGame===game.id);
   return pick&&!pick.hidden;
  });
  if(!visible.length)return;
  const next=visible[Math.floor(Math.random()*visible.length)];
  open(next.id);
 });
 again.addEventListener('click',()=>{
  try{const recent=localStorage.getItem(key);if(allowed(recent))open(recent)}
  catch{}
 });
 window.addEventListener('pagehide',stopTimer,{once:true});
 window.aioInSitePlay={open,close:stop,isAllowed:id=>!!allowed(id),gameUrl};
})();
