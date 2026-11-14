/* Cloud gaming launcher: real provider links, no claimed in-site game hosting. */
(() => {
 'use strict';
 const root=document.getElementById('cloud-gaming');
 if(!root||root.dataset.cloudReady==='1')return;
 root.dataset.cloudReady='1';

 const GAMES=Object.freeze({
  fortnite:{name:'Fortnite',provider:'Xbox Cloud Gaming',url:'https://www.xbox.com/en-GB/play/games/fortnite/BT5P2X999VH2'},
  roblox:{name:'Roblox',provider:'EasyFun (third party)',url:'https://www.easyfun.gg/cloud-games/roblox.html'}
 });
 const rememberKey='aio-cloud-last-game-v1';
 const get=id=>Object.prototype.hasOwnProperty.call(GAMES,id)?GAMES[id]:null;
 const $=id=>document.getElementById(id);
 const create=(tag,cls,text)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=text;
  return el;
 };
 const link=(label,gameId,className)=>{
  const game=get(gameId);
  const el=create('a',className,label);
  el.href=game.url;el.target='_blank';el.rel='noopener noreferrer';
  el.dataset.cloudGame=gameId;
  return el;
 };

 function enhanceCards(){
  const cards=root.querySelectorAll('.aio-cloud-card');
  const fortnite=cards[0],roblox=root.querySelector('.aio-cloud-card.roblox');
  if(fortnite){
   const target=fortnite.querySelector('a');
   if(target){
    target.dataset.cloudGame='fortnite';
    target.href=GAMES.fortnite.url;
    target.target='_blank';target.rel='noopener noreferrer';
   }
   const label=fortnite.querySelector('.cloud-status');
   if(label)label.textContent='VERIFIED CLOUD LAUNCH';
   const details=create('small','aio-cloud-provider-note','Xbox streams Fortnite. A free Microsoft account and a supported browser or controller may be needed.');
   fortnite.appendChild(details);
  }
  if(roblox){
   const old=roblox.querySelector('a');
   const status=roblox.querySelector('.cloud-status');
   const summary=roblox.querySelector('p');
   if(status)status.textContent='THIRD-PARTY CLOUD OPTION';
   if(summary)summary.textContent='Try Roblox through EasyFun browser streaming. Service availability and account requirements can change.';
   const actions=create('div','aio-cloud-actions');
   actions.appendChild(link('Try Roblox cloud ↗','roblox','btn primary'));
   if(old){
    old.textContent='Official Roblox app ↗';
    old.href='https://www.roblox.com/';
    old.target='_blank';old.rel='noopener noreferrer';
    actions.appendChild(old);
   }
   roblox.appendChild(actions);
   roblox.appendChild(create('small','aio-cloud-provider-note','Third-party service, not operated by All in One Edition or Roblox. Check the service before signing in.'));
  }
 }

 function lastPlayed(){
  try{
   const id=localStorage.getItem(rememberKey);
   return get(id)?id:null;
  }catch{return null}
 }
 function updateResume(){
  const id=lastPlayed(),recent=$('aioCloudRecent'),resume=$('aioCloudResume');
  if(!recent||!resume)return;
  recent.textContent=id?'Last opened: '+GAMES[id].name+' via '+GAMES[id].provider:'Nothing launched from this device yet.';
  if(id){
   resume.hidden=false;resume.href=GAMES[id].url;resume.dataset.cloudGame=id;
   resume.textContent='Open '+GAMES[id].name+' again ↗';
  }else resume.hidden=true;
 }
 function networkSummary(){
  if(navigator.onLine===false)return 'Your browser reports you are offline. Connect to the internet first.';
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  if(!connection)return 'Online status reported. This browser does not share connection estimates. Streaming quality is determined by the provider.';
  if(connection.saveData)return 'Data Saver is on. A lower stream quality may use less data. Check your provider settings.';
  const type=String(connection.effectiveType||'').toLowerCase();
  if(type==='slow-2g'||type==='2g')return 'Your browser reports a slow connection. Cloud gaming could struggle.';
  if(type==='3g')return 'Your browser estimates a 3G connection. You may see buffering or lag.';
  if(type==='4g')return 'Your browser estimates a fast connection. This is not a streaming speed or latency test.';
  return 'Online. Try the cloud provider to check actual latency and availability.';
 }
 function controllerSummary(){
  if(!navigator.getGamepads)return 'Controller detection is unavailable in this browser.';
  try{
   const pads=Array.from(navigator.getGamepads()||[]);
   return pads.some(p=>p&&p.connected)?'Controller detected. Check the provider for supported controls.':'No controller detected. Connect one or use supported touch controls.';
  }catch{return 'Controller permission or browser support is unavailable.'}
 }
 function refreshDiagnostics(){
  const connection=$('aioCloudConnection'),controller=$('aioCloudController');
  if(connection)connection.textContent=networkSummary();
  if(controller)controller.textContent=controllerSummary();
 }
 function installToolkit(){
  const grid=root.querySelector('.aio-cloud-grid');
  if(!grid)return;
  const tools=create('div','aio-cloud-tools');
  tools.innerHTML=`
    <div class="aio-cloud-tool">
      <div class="aio-cloud-tool-heading"><h3>Ready to stream?</h3><button class="btn mini" type="button" id="aioCloudCheck">Recheck</button></div>
      <p id="aioCloudConnection" role="status">Checking browser connection…</p>
      <p id="aioCloudController">Checking controller support…</p>
      <p class="aio-cloud-fine">These are browser hints, not live measurements of Xbox or EasyFun. No game video or remote computer is hosted here.</p>
    </div>
    <div class="aio-cloud-tool">
      <h3>Quick resume & Party</h3>
      <p id="aioCloudRecent">Nothing launched yet.</p>
      <a id="aioCloudResume" class="btn mini" href="#" target="_blank" rel="noopener noreferrer" hidden>Open last game</a>
      <label class="aio-cloud-party"><input id="aioCloudPartyShare" type="checkbox"> Let my current party see which cloud game I launch</label>
      <p id="aioCloudPartyNote" class="aio-cloud-fine">Party sharing is optional. Use the game's own invitations to join the same multiplayer session.</p>
      <button class="btn mini" id="aioCloudPartyClear" type="button">Clear party activity</button>
    </div>`;
  grid.after(tools);
  $('aioCloudCheck')?.addEventListener('click',refreshDiagnostics);
  $('aioCloudPartyClear')?.addEventListener('click',()=>{
   if(typeof window.aioPartyCloudStop==='function')window.aioPartyCloudStop();
   if($('aioCloudPartyShare'))$('aioCloudPartyShare').checked=false;
   if($('aioCloudPartyNote'))$('aioCloudPartyNote').textContent='Cloud activity is no longer shown to your party.';
  });
  refreshDiagnostics();updateResume();
 }

 function launched(id){
  const game=get(id);if(!game)return;
  try{localStorage.setItem(rememberKey,id)}catch{}
  updateResume();
  const share=$('aioCloudPartyShare');
  if(!share?.checked)return;
  const shown=typeof window.aioPartyCloudLaunch==='function'&&window.aioPartyCloudLaunch(id);
  const note=$('aioCloudPartyNote');
  if(note)note.textContent=shown
    ? 'Your party can see that you opened '+game.name+'. This does not join the same match automatically.'
    : 'Join a party first to share your cloud launch status. Your game link still works.';
 }
 enhanceCards();installToolkit();
 root.addEventListener('click',event=>{
  const target=event.target?.closest?.('a[data-cloud-game]');
  if(target)launched(target.dataset.cloudGame);
 });
 window.addEventListener('online',refreshDiagnostics);
 window.addEventListener('offline',refreshDiagnostics);
 window.addEventListener('gamepadconnected',refreshDiagnostics);
 window.addEventListener('gamepaddisconnected',refreshDiagnostics);
 window.aioCloudGaming={networkSummary,controllerSummary,allowedGame:id=>Boolean(get(id))};
})();