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
  {id:'blocks',title:'Block Drop',kind:'Puzzle',hint:'Use arrows or touch controls.'}
 ]);
 const allowed=id=>originals.find(game=>game.id===id)||null;
 const gameUrl=id=>allowed(id)?'/games/arcade-collection.html?game='+id:null;
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
 heading.append(copy,last);

 const picks=make('div','aio-in-site-picks');
 picks.setAttribute('role','group');
 picks.setAttribute('aria-label','Games playable here');
 for(const game of originals){
  const button=makeButton(game.title,'aio-in-site-pick');
  button.dataset.aioGame=game.id;
  const category=make('small','',game.kind);
  button.appendChild(category);
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
 stage.append(toolbar,viewport,status);
 section.append(heading,picks,stage);
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
   setStatus(game.title+' player opened. '+game.hint);
  });
  currentFrame.addEventListener('error',()=>{
   if(frame!==currentFrame||active!==id)return;
   stopTimer();
   setStatus('The browser could not open this game. Try Restart.');
  });
  viewport.replaceChildren(frame);
  frame.src=gameUrl(id);
  loadTimer=setTimeout(()=>{
   if(frame===currentFrame&&active===id)
    setStatus('Still opening the game. Try Restart if it stays blank.');
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
 window.addEventListener('pagehide',stopTimer,{once:true});
 window.aioInSitePlay={open,close:stop,isAllowed:id=>!!allowed(id),gameUrl};
})();
