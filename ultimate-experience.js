(()=>{'use strict';
const $=id=>document.getElementById(id),KEY='aio-ultimate-onboarding-v1';
let step=0,font='inter',wall='default',cursor='chatgpt',fontChosen=false,wallChosen=false,cursorChosen=false,menuIndex=0;
const rpc=async(n,a)=>{if(typeof supabaseClient==='undefined'||!supabaseClient)throw Error('Supabase is not ready.');const r=await supabaseClient.rpc(n,a||{});if(r.error)throw r.error;return r.data};
function startAioDashboardClock(){
  const dateEl=$('date'),clockEl=$('clock'),homeEl=$('homeCountdown');
  if(!dateEl&&!clockEl&&!homeEl)return;
  const tick=()=>{
    const now=new Date();
    if(clockEl)clockEl.textContent=now.toLocaleTimeString('en-GB');
    if(dateEl)dateEl.textContent=now.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
    if(homeEl){
      const target=new Date(now);
      target.setHours(15,30,0,0);
      if(now.getDay()===0||now.getDay()===6||now>=target){
        do{target.setDate(target.getDate()+1)}while(target.getDay()===0||target.getDay()===6);
        target.setHours(15,30,0,0);
      }
      const ms=Math.max(0,target.getTime()-now.getTime());
      const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);
      homeEl.textContent=[h,m,s].map(n=>String(n).padStart(2,'0')).join(':');
      homeEl.setAttribute('aria-label','Time remaining until hometime at 15:30');
    }
  };
  const sync=()=>{
    if(window.aioDashboardClockTimer){clearInterval(window.aioDashboardClockTimer);window.aioDashboardClockTimer=0;}
    if(document.hidden)return;
    tick();
    window.aioDashboardClockTimer=setInterval(tick,1000);
  };
  sync();
  if(!window.aioDashboardClockVisibilityBound){
    window.aioDashboardClockVisibilityBound=true;
    document.addEventListener('visibilitychange',sync);
  }
}
function startAioLiveClock(){const el=$('aioLiveClock');if(!el||el.dataset.clockBound==='1')return;el.dataset.clockBound='1';let timer=0;const tick=()=>{el.textContent=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false});if(timer)clearTimeout(timer);if(!document.hidden)timer=setTimeout(tick,60000-(Date.now()%60000)+40)};tick();document.addEventListener('visibilitychange',()=>{if(timer)clearTimeout(timer);timer=0;if(!document.hidden)tick()})}
const toast=s=>typeof showToast==='function'?showToast(s):console.info(s);
const slug=s=>String(s||'game').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,110)||'game';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const appearance=()=>window.AIOAppearance?.getState?.()||{};
const setChoice=o=>window.AIOAppearance?.setChoice?.(o);
const signed=()=>{try{return typeof currentUser!=='undefined'&&!!currentUser}catch{return false}};
const walls=()=>window.AIOAppearance?.getWallpapers?.()||[{id:'default',name:'Default',bg:'linear-gradient(135deg,#f7f7f8,#e8edf7)'},{id:'midnight',name:'Midnight',bg:'linear-gradient(135deg,#05070f,#28334d)'},{id:'aurora',name:'Aurora',bg:'linear-gradient(135deg,#10152d,#42e8c5)'},{id:'arcade',name:'Arcade neon',bg:'linear-gradient(135deg,#11112b,#ff4dd2)'}];
function ensureOnboard(){if($('aioOnboarding'))return;const m=document.createElement('div');m.id='aioOnboarding';m.className='aio-ultimate-modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.innerHTML='<div class="aio-onboard-card"><div class="aio-onboard-top"><div class="aio-onboard-mark">A</div><span id="aioOnboardStep">WELCOME · SETUP + WALKTHROUGH</span><button class="aio-icon-button" id="aioOnboardClose" aria-label="Close setup">×</button></div><div class="aio-onboard-progress" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax="100"><span id="aioOnboardProgress"></span></div><div id="aioOnboardContent"></div><div class="aio-onboard-footer"><span>Your choices apply immediately.</span><div id="aioOnboardActions"></div></div></div>';document.body.append(m);$('aioOnboardClose').onclick=()=>{if(step===0){toast('Choose Start setup or Use current settings.');return}closeOnboard()}}
function openOnboard(reset){ensureOnboard();if(reset)localStorage.removeItem(KEY);const a=appearance();font=a.font||'inter';wall=a.wallpaper||'default';cursor=a.cursorStyle||'chatgpt';fontChosen=false;wallChosen=false;cursorChosen=false;step=0;renderOnboard();$('aioOnboarding').classList.add('open');document.body.classList.add('aio-onboarding-open')}
function closeOnboard(){ $('aioOnboarding')?.classList.remove('open');document.body.classList.remove('aio-onboarding-open')}
function renderOnboard(){
const content=$('aioOnboardContent'),actions=$('aioOnboardActions'),total=6;
const set=(label,title,copy)=>{$('aioOnboardStep').textContent=label;content.innerHTML='<h2>'+title+'</h2><p class="aio-onboard-copy">'+copy+'</p>'};
const progress=$('aioOnboardProgress');if(progress){const percent=Math.round((step+1)/total*100);progress.style.width=percent+'%';progress.parentElement?.setAttribute('aria-valuenow',String(percent));}
if(step===0){
  set('WELCOME · SETUP + WALKTHROUGH','Your hub, set up your way','A quick guided start: personalise the look, then learn where everything lives. You can replay the full setup from Settings whenever you need it.');
  content.innerHTML+='<div class="aio-setup-intro-grid"><div><span>01</span><strong>Personalise</strong><small>Pick your font, wallpaper and cursor.</small></div><div><span>02</span><strong>Explore</strong><small>See how games, tools, school and Social fit together.</small></div></div><div class="aio-setup-tip">Your choices apply immediately. Nothing is posted or shared during setup.</div>';
  actions.innerHTML='<button class="aio-secondary-button" id="aioUseDefaults">Use current settings</button><button class="aio-primary-button" id="aioStartSetup">Start setup →</button>';
  $('aioUseDefaults').onclick=()=>{localStorage.setItem(KEY,JSON.stringify({completed:true,font,wallpaper:wall,cursor,at:Date.now(),skippedPersonalisation:true}));closeOnboard();toast('Current settings kept. Enjoy the hub!')};
  $('aioStartSetup').onclick=()=>{step=1;renderOnboard()};
}
else if(step===1){
  set('STEP 2 OF 6 · TYPE','Choose your font','Pick a typeface for the whole hub. The preview updates as soon as you select one.');
  content.innerHTML+='<div class="aio-font-choices">'+[['system','Default / System','system-ui,sans-serif'],['inter','Inter','Inter,system-ui,sans-serif'],['nunito','Nunito','Nunito,system-ui,sans-serif'],['cherry','Cherry Bomb One','"Cherry Bomb One",system-ui,sans-serif'],['sakura','Sakura (fallback)','"Sakura",Georgia,serif']].map(x=>'<button class="aio-font-choice '+(font===x[0]?'selected':'')+'" data-font="'+x[0]+'" style="font-family:'+x[2]+'"><span>'+x[1]+'</span><strong>All in One Edition</strong><small>The quick brown fox jumps over the lazy dog.</small></button>').join('')+'</div>';
  content.querySelectorAll('[data-font]').forEach(b=>b.onclick=()=>{font=b.dataset.font;fontChosen=true;setChoice({font});renderOnboard()});
  actions.innerHTML='<button class="aio-secondary-button" id="aioBack">Back</button><button class="aio-primary-button" id="aioNext" '+(fontChosen?'':'disabled')+'>Continue →</button>';
  $('aioBack').onclick=()=>{step=0;renderOnboard()};$('aioNext').onclick=()=>{if(!fontChosen){toast('Choose a font to continue.');return}step=2;renderOnboard()};
}
else if(step===2){
  set('STEP 3 OF 6 · BACKGROUND','Choose your wallpaper','Select a background. The page preview changes immediately, so you can see the result before continuing.');
  content.innerHTML+='<div class="aio-wallpaper-choices">'+walls().map(w=>'<button class="aio-wall-choice '+(wall===w.id?'selected':'')+'" data-wall="'+esc(w.id)+'"><span class="aio-wall-preview" style="background:'+w.bg+'"></span><span>'+esc(w.name)+'</span>'+(wall===w.id?'<b>✓</b>':'')+'</button>').join('')+'</div><p class="aio-onboard-note">Custom uploads remain available in Personalisation settings.</p>';
  content.querySelectorAll('[data-wall]').forEach(b=>b.onclick=()=>{wall=b.dataset.wall;wallChosen=true;setChoice({wallpaper:wall});renderOnboard()});
  actions.innerHTML='<button class="aio-secondary-button" id="aioBack">Back</button><button class="aio-primary-button" id="aioNext" '+(wallChosen?'':'disabled')+'>Continue →</button>';
  $('aioBack').onclick=()=>{step=1;renderOnboard()};$('aioNext').onclick=()=>{step=3;renderOnboard()};
}
else if(step===3){
  set('STEP 4 OF 6 · POINTER','Choose your cursor','Choose a lightweight pointer style. Text fields keep their normal text-selection cursor.');
  content.innerHTML+='<div class="aio-cursor-choices">'+[['default','Default','Use the browser cursor.'],['minimal','Minimal','A clean, lightweight pointer.'],['chatgpt','ChatGPT-inspired','A small, sharp custom pointer.']].map(x=>'<button class="aio-cursor-choice '+(cursor===x[0]?'selected':'')+'" data-cursor="'+x[0]+'"><span class="aio-cursor-preview '+x[0]+'">↖</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></button>').join('')+'</div>';
  content.querySelectorAll('[data-cursor]').forEach(b=>b.onclick=()=>{cursor=b.dataset.cursor;cursorChosen=true;setChoice({cursorStyle:cursor});renderOnboard()});
  actions.innerHTML='<button class="aio-secondary-button" id="aioBack">Back</button><button class="aio-primary-button" id="aioNext" '+(cursorChosen?'':'disabled')+'>Continue →</button>';
  $('aioBack').onclick=()=>{step=2;renderOnboard()};$('aioNext').onclick=()=>{if(!cursorChosen){toast('Choose a cursor first.');return}step=4;renderOnboard()};
}
else if(step===4){
  set('STEP 5 OF 6 · QUICK TOUR','Here’s where everything lives','The walkthrough is part of this setup now. These are the main areas you will use around the hub.');
  content.innerHTML+='<div class="aio-setup-tour-grid"><article class="aio-setup-tour-card"><span>⌕</span><div><strong>Search + Games</strong><p>Search the catalogue from the top bar. Browse categories, favourites and recently played. Games load only when opened.</p></div></article><article class="aio-setup-tour-card"><span>▦</span><div><strong>School + Tools</strong><p>School apps, calculators, timers, notes and other everyday utilities are grouped in their own sections.</p></div></article><article class="aio-setup-tour-card"><span>◉</span><div><strong>Social + Community</strong><p>Open Social to view posts and videos. Your account controls sign-in and community features.</p></div></article><article class="aio-setup-tour-card"><span>⚙</span><div><strong>Settings + Personalisation</strong><p>Change appearance and preferences later. Replay this complete setup and walkthrough whenever you need a reminder.</p></div></article></div><div class="aio-setup-tip">Tip: use the navigation row to jump between sections. You can always return to Home from the top of the page.</div>';
  actions.innerHTML='<button class="aio-secondary-button" id="aioBack">Back</button><button class="aio-primary-button" id="aioNext">Finish setup →</button>';
  $('aioBack').onclick=()=>{step=3;renderOnboard()};$('aioNext').onclick=()=>{step=5;renderOnboard()};
}
else{
  set('STEP 6 OF 6 · READY','You’re ready.','Your hub is personalised and you have the quick tour. You can replay this entire setup from Settings → Personalisation.');
  content.innerHTML+='<div class="aio-ready-mark">✓</div><div class="aio-summary-list"><div><span>Font</span><strong>'+esc(({system:'Default / System',inter:'Inter',nunito:'Nunito',cherry:'Cherry Bomb One',sakura:'Sakura (fallback)'})[font]||font)+'</strong></div><div><span>Wallpaper</span><strong>'+esc(walls().find(w=>w.id===wall)?.name||wall)+'</strong></div><div><span>Cursor</span><strong>'+esc(({default:'Default',minimal:'Minimal',chatgpt:'ChatGPT-inspired'})[cursor]||cursor)+'</strong></div><div><span>Walkthrough</span><strong>Included ✓</strong></div></div>';
  actions.innerHTML='<button class="aio-secondary-button" id="aioBack">Back to tour</button><button class="aio-primary-button" id="aioEnter">Enter All in One Edition →</button>';
  $('aioBack').onclick=()=>{step=4;renderOnboard()};
  $('aioEnter').onclick=()=>{localStorage.setItem(KEY,JSON.stringify({completed:true,font,wallpaper:wall,cursor,at:Date.now()}));closeOnboard();toast('Setup complete. Enjoy the hub!')};
}
}
// Restore simple catalogue filters without purchase gates.
let discoveryFilter='all';
function addDiscoveryToolbar(){
 const grid=$('gameGrid');if(!grid||$('aioDiscoveryFilters'))return;
 const bar=document.createElement('div');bar.id='aioDiscoveryFilters';bar.className='aio-discovery-filters';
 bar.innerHTML='<button data-discovery="all" class="active">All games</button><button data-discovery="recent">Recently played</button><button data-discovery="favourites">Favourites</button><button data-discovery="new">New</button><button data-discovery="random">Random game</button>';
 grid.parentElement.insertBefore(bar,grid);
 bar.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{
  const filter=btn.dataset.discovery;
  if(filter==='random'){if(GAMES.length)window.openGame(Math.floor(Math.random()*GAMES.length));return}
  discoveryFilter=filter;
  bar.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));
  if(typeof renderGames==='function'){visibleLimit=48;renderGames();}
 });
}
function patchDiscoveryFilter(){
 if(typeof window.filteredGames!=='function'||window.filteredGames.__aioDiscovery)return;
 const orig=window.filteredGames;
 const fn=function(){
  let list=orig();
  if(discoveryFilter==='favourites')list=list.filter(x=>favouriteGames.has(gameKey(x.g)));
  else if(discoveryFilter==='recent')list=list.filter(x=>Number((gameProgress[gameKey(x.g)]||{}).lastPlayed||0)>0).sort((a,b)=>Number((gameProgress[gameKey(b.g)]||{}).lastPlayed||0)-Number((gameProgress[gameKey(a.g)]||{}).lastPlayed||0));
  else if(discoveryFilter==='new')list=list.filter(x=>x.g.new||/new/i.test(x.g.tag||''));
  return list;
 };fn.__aioDiscovery=true;window.filteredGames=fn;
}
function enhanceSmartAI(){
 if(typeof window.executeSmartCommand!=='function'||window.executeSmartCommand.__aioCatalog)return;
 const orig=window.executeSmartCommand;
 const fn=function(raw){
  const q=String(raw||'').toLowerCase();
  if(/what game should i play|recommend.*game|random game/.test(q)){
   const list=GAMES.filter(g=>g.url);if(!list.length)return 'Open Games to browse the library.';
   const g=list[Math.floor(Math.random()*list.length)];
   return 'Try '+g.name+' ('+g.cat+'). '+(g.description||g.desc||'Open the game to find out more.');
  }
  if(/free.*racing|racing.*free/.test(q)){
   const list=GAMES.filter(g=>/racing|race|kart/i.test([g.name,g.cat,g.description].join(' ')));
   return list.length?'Racing games: '+list.slice(0,5).map(g=>g.name).join(', ')+'.':'Search for Racing in Games.';
  }
  return orig(raw);
 };fn.__aioCatalog=true;window.executeSmartCommand=fn;
}
function addSlime(){try{if(typeof GAMES==='undefined'||GAMES.some(g=>/pizzaedition\.com\/g\/slimekeyboardescape/i.test(g.url||'')))return;GAMES.push({id:'slime-keyboard-escape',name:'Slime Keyboard Escape',description:'A solo platform-running game set on a giant keyboard. Build speed, jump gaps, reach checkpoints and bank wins.',cat:'Platformer',url:'https://pizzaedition.com/g/slimekeyboardescape',source:'Pizza Edition',sourceUrl:'https://pizzaedition.com/g/slimekeyboardescape',img:'',tag:'New',controls:'WASD or arrow keys to move; mouse to change camera; Space to jump; C for skins; R for rebirth; P for shop; T for treadmill; E to interact. Touch screens use an on-screen joystick and jump button.',license:'Externally hosted by Pizza Edition; not redistributed',new:true,difficulty:'Normal',fullscreenSupported:true,multiplayer:false});if(typeof renderFilters==='function')renderFilters();if(typeof renderGames==='function')renderGames()}catch(e){console.warn(e)}}
function addOpenSourceGames(){try{if(typeof GAMES==='undefined')return;const data=[['ant-flap','Ant Flap','Arcade'],['ant-jump','Ant Jump','Arcade'],['block-drop','Block Drop','Arcade'],['breakout','Breakout','Arcade'],['paddle-duel','Paddle Duel','Arcade'],['stack-tower','Stack Tower','Arcade'],['whack-a-mole','Whack-a-Mole','Arcade'],['snake','Snake','Classic'],['tic-tac-toe','Tic Tac Toe','Classic'],['connect-four','Connect Four','Classic'],['2048','2048','Puzzle'],['minesweeper','Minesweeper','Puzzle'],['memory-match','Memory Match','Puzzle'],['dino-run','Dino Run','Action'],['piano-tap','Piano Tap','Arcade'],['cross-road','Cross Road','Arcade'],['slide-puzzle','Slide Puzzle','Puzzle'],['bubble-shooter','Bubble Shooter','Arcade'],['sudoku','Sudoku','Puzzle'],['merge-drop','Merge Drop','Puzzle'],['water-sort','Water Sort','Puzzle'],['helix-drop','Helix Drop','Action'],['gem-match','Gem Match','Puzzle'],['maze-muncher','Maze Muncher','Arcade'],['air-hockey','Air Hockey','Action'],['reversi','Reversi','Classic'],['sokoban','Sokoban','Puzzle'],['lights-out','Lights Out','Puzzle'],['hanoi','Hanoi','Puzzle'],['pipe-connect','Pipe Connect','Puzzle'],['rush-hour','Rush Hour','Puzzle'],['mahjong-link','Mahjong Link','Puzzle'],['nonogram','Nonogram','Puzzle'],['checkers','Checkers','Classic'],['snakes-ladders','Snakes and Ladders','Classic'],['hoop-shot','Hoop Shot','Action'],['mini-golf','Mini Golf','Action'],['helicopter','Helicopter','Arcade'],['balloon-pop','Balloon Pop','Arcade'],['simon-says','Simon Says','Arcade'],['gomoku','Gomoku','Classic'],['mancala','Mancala','Classic'],['bowling','Bowling','Action'],['penalty-kick','Penalty Kick','Action']];let added=0;for(const [id,name,cat] of data){const url='https://mashukui.github.io/web-games/'+id+'/';if(GAMES.some(g=>slug(g.id||g.name)===id||g.url===url))continue;GAMES.push({id,name,description:name+' browser game from the MIT-licensed mashukui/web-games collection.',cat,url,source:'Open-source: mashukui/web-games',sourceUrl:'https://github.com/mashukui/web-games',img:'',tag:'MIT',controls:'Use the instructions shown in the game. The collection supports keyboard, mouse and touch where appropriate.',license:'MIT © 2026 mashukui; see the source repository for licence text.',featured:false,new:true,difficulty:'Normal',fullscreenSupported:true,multiplayer:id==='tic-tac-toe'});added++}window.AIOGameRegistry={list:()=>GAMES.map(g=>({id:slug(g.id||g.name),title:g.name,description:g.description||'',category:g.cat||'Other',thumbnail:g.img||'',source:g.source||'Existing catalogue',sourceUrl:g.sourceUrl||g.url||'',launchUrl:g.url||'',controls:g.controls||'See game instructions.',tags:g.tags||[],featured:!!g.featured,new:!!g.new,difficulty:g.difficulty||'Normal',fullscreenSupported:g.fullscreenSupported!==false,multiplayer:!!g.multiplayer,license:g.license||'Not verified'})),find:id=>GAMES.find(g=>slug(g.id||g.name)===id||g.name===id)||null};if(added&&typeof renderFilters==='function')renderFilters();if(added&&typeof renderGames==='function')renderGames()}catch(e){console.warn('Open-source catalogue import:',e)}}
function addSubmissionPanel(){const grid=$('gameGrid');if(!grid||$('aioSubmitGamePanel'))return;const panel=document.createElement('details');panel.id='aioSubmitGamePanel';panel.className='aio-submit-panel';panel.innerHTML='<summary>Submit a community game</summary><p>Submissions stay private until an owner approves them. Use HTTPS links; submitted code is sandboxed away from the main app.</p><form id="aioSubmitGameForm"><div class="aio-submit-grid"><label>Game title<input name="title" required minlength="3" maxlength="80" placeholder="Game title"></label><label>Category<select name="category"><option>Arcade</option><option>Classic</option><option>Puzzle</option><option>Action</option><option>Platformer</option><option>Racing</option><option>Sports</option><option>Casual</option><option>Idle</option><option>Other</option></select></label><label class="wide">Game URL (HTTPS)<input name="game_url" type="url" required placeholder="https://example.com/game"></label><label class="wide">Description<textarea name="description" maxlength="1000" rows="2" placeholder="What is the game about?"></textarea></label><label>Thumbnail URL (optional)<input name="thumbnail_url" type="url" placeholder="https://..."></label><label>Creator name<input name="creator_name" maxlength="80" placeholder="Creator / studio"></label><label class="wide">Controls<input name="controls" maxlength="500" placeholder="Instructions from the original game"></label></div><button class="aio-primary-button" type="submit">Submit for review</button> <span id="aioSubmitStatus" role="status"></span></form></details>';const toolbar=$('aioDiscoveryFilters');grid.parentElement.insertBefore(panel,toolbar||grid);$('aioSubmitGameForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,status=$('aioSubmitStatus');if(!signed()){toast('Sign in before submitting a game.');window.handleAccountClick?.();return}const data=Object.fromEntries(new FormData(form).entries());if(!/^https:\/\/\S+$/i.test(data.game_url)||data.thumbnail_url&&!/^https:\/\/\S+$/i.test(data.thumbnail_url)){status.textContent='Use HTTPS links for the game and thumbnail.';return}const btn=form.querySelector('button[type="submit"]');btn.disabled=true;status.textContent='Sending for moderation…';try{await rpc('aio_submit_game',{p_title:data.title,p_description:data.description||'',p_category:data.category,p_thumbnail_url:data.thumbnail_url||'',p_game_url:data.game_url,p_controls:data.controls||'',p_creator_name:data.creator_name||''});form.reset();status.textContent='Submitted. It will appear after owner approval.';toast('Community game submitted for review.')}catch(err){status.textContent=err.message||'Submission failed.'}finally{btn.disabled=false}})}
function ensureContext(){if($('aioContextMenu'))return;const m=document.createElement('div');m.id='aioContextMenu';m.className='aio-context-menu';m.setAttribute('role','menu');document.body.append(m);document.addEventListener('contextmenu',e=>{if(!matchMedia('(pointer:fine)').matches||e.defaultPrevented)return;const t=e.target;if(t.closest('input,textarea,select,[contenteditable="true"],.game-stage,#aioOnboarding')||String(getSelection()||'').trim())return;e.preventDefault();openContext(e.clientX,e.clientY)});let touchTimer=null,touchOrigin=null;const cancelTouchMenu=()=>{if(touchTimer!==null)clearTimeout(touchTimer);touchTimer=null;touchOrigin=null};document.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!e.isPrimary||e.target.closest('input,textarea,select,[contenteditable="true"],button,a,[role="button"],.game-stage,#aioOnboarding'))return;touchOrigin={x:e.clientX,y:e.clientY};touchTimer=setTimeout(()=>{if(touchOrigin){const p=touchOrigin;touchOrigin=null;touchTimer=null;openContext(p.x,p.y)}},650)},{passive:true});document.addEventListener('pointerup',cancelTouchMenu,{passive:true});document.addEventListener('pointercancel',cancelTouchMenu,{passive:true});document.addEventListener('pointermove',e=>{if(touchOrigin&&Math.hypot(e.clientX-touchOrigin.x,e.clientY-touchOrigin.y)>12)cancelTouchMenu()},{passive:true});document.addEventListener('pointerdown',e=>{if(!e.target.closest('#aioContextMenu'))m.classList.remove('open')});window.addEventListener('resize',()=>m.classList.remove('open'));document.addEventListener('keydown',e=>{if((e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10'))&&!e.target.closest('input,textarea,select,[contenteditable="true"]')){e.preventDefault();const rect=e.target.getBoundingClientRect?.();openContext(rect?rect.left:12,rect?rect.bottom:12)}if(e.key==='Escape')m.classList.remove('open')if(m.classList.contains('open')){const bs=[...m.querySelectorAll('button')];if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();menuIndex=(menuIndex+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length;bs[menuIndex]?.focus()}else if(e.key==='Home'){e.preventDefault();menuIndex=0;bs[0]?.focus()}else if(e.key==='End'){e.preventDefault();menuIndex=bs.length-1;bs[menuIndex]?.focus()}}})}
function openContext(x,y){const m=$('aioContextMenu'),items=[['Back','Go back',()=>history.back()],['Forward','Go forward',()=>history.forward()],['Reload','Reload page',()=>location.reload()],['Games','Browse games',()=>document.querySelector('[data-scroll="games"]')?.click()],['Random game','Launch a random game',()=>{if(GAMES?.length)window.openGame(Math.floor(Math.random()*GAMES.length))}],['Settings','Personalisation',()=>window.openSettings?.()],['Toggle wallpaper','Show or hide wallpaper',()=>document.documentElement.classList.toggle('aio-wallpaper-hidden')],];if($('gameModal')?.classList.contains('open'))items.splice(5,0,['Fullscreen','Toggle game fullscreen',()=>window.fullscreenGame?.()]);m.innerHTML=items.map((it,i)=>'<button role="menuitem" data-i="'+i+'"><span>'+it[0]+'</span><small>'+it[1]+'</small></button>').join('');m.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{m.classList.remove('open');try{const result=items[i][2]();if(result&&typeof result.then==='function')result.catch(e=>toast('Menu action failed: '+(e?.message||'try again')))}catch(e){toast('Menu action failed: '+(e?.message||'try again'))}});m.classList.add('open');m.style.left=Math.max(8,Math.min(x,innerWidth-228))+'px';m.style.top=Math.max(8,Math.min(y,innerHeight-Math.min(items.length*45+10,innerHeight-16)-8))+'px';menuIndex=0;m.querySelector('button')?.focus()}
function init(){
 startAioDashboardClock();addSlime();addOpenSourceGames();
 patchDiscoveryFilter();enhanceSmartAI();ensureOnboard();
 addDiscoveryToolbar();startAioLiveClock();ensureContext();addSubmissionPanel();
 if(!localStorage.getItem(KEY))setTimeout(()=>{if(!document.hidden)openOnboard(false)},800);
}
window.openAioOnboarding=()=>openOnboard(false);
window.resetAioOnboarding=()=>{try{localStorage.removeItem(KEY)}catch{}openOnboard(false)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
/* Personal greeting and a lightweight, accessible custom cursor. */
(function(){
  'use strict';
  const style=document.createElement('style');
  style.textContent=`
    #aioGreeting{display:inline-flex;align-items:center;gap:7px;max-width:230px;padding:7px 11px;border:1px solid var(--line,#e5e6ea);border-radius:12px;background:var(--panel,#fff);color:var(--text,#222);font-size:11px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0;transform:translateY(5px);animation:aioGreetingIn .55s cubic-bezier(.2,.8,.2,1) .12s forwards}
    #aioGreeting .aio-greeting-dot{width:7px;height:7px;flex:none;border-radius:50%;background:#38b889;box-shadow:0 0 0 3px color-mix(in srgb,#38b889 15%,transparent)}
    @keyframes aioGreetingIn{to{opacity:1;transform:translateY(0)}}
    @media(max-width:900px){#aioGreeting{display:none}}
    @media(pointer:fine){html.aio-custom-cursor,html.aio-custom-cursor body{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='28' viewBox='0 0 24 28'%3E%3Cpath d='M3 2 L3 22 L8.5 16.5 L12.5 25 L16 23.5 L12 15.5 L20 15 Z' fill='%231b5cff' stroke='white' stroke-width='1.7' stroke-linejoin='round'/%3E%3C/svg%3E") 3 2,auto}
      html.aio-custom-cursor button,html.aio-custom-cursor a,html.aio-custom-cursor [role=button],html.aio-custom-cursor select{cursor:pointer}
      html.aio-custom-cursor input,html.aio-custom-cursor textarea,[contenteditable=true]{cursor:text}
    }
  `;
  document.head.append(style);
  document.documentElement.classList.add('aio-custom-cursor');
  function refresh(){
    try{
      const user=typeof currentUser!=='undefined'?currentUser:null;
      const profile=typeof currentProfile!=='undefined'?currentProfile:null;
      let el=document.getElementById('aioGreeting');
      if(!user){el?.remove();return}
      const name=String(profile?.username||user.user_metadata?.username||'there').trim().slice(0,24)||'there';
      const hour=new Date().getHours();
      const salutation=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
      if(!el){el=document.createElement('div');el.id='aioGreeting';el.setAttribute('role','status');const top=document.querySelector('#topbar .top');const brand=top?.querySelector('.brand');if(top&&brand)brand.after(el);else top?.prepend(el)}
      if(el)el.innerHTML='<span class="aio-greeting-dot" aria-hidden="true"></span><span>'+salutation+', '+name+'</span>';
    }catch(error){console.debug('Greeting unavailable',error)}
  }
  window.aioRefreshGreeting=refresh;
  const original=window.handleAuthSession;
  if(typeof original==='function'&&!original.__aioGreetingWrapped){
    const wrapped=async function(session){const result=await original.call(this,session);refresh();return result};
    wrapped.__aioGreetingWrapped=true;window.handleAuthSession=wrapped;
  }
  refresh();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  window.addEventListener('pageshow',refresh);
})();
