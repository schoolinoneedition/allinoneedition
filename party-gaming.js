/* Live guest-friendly parties. Room codes are bearer invites: share them only with friends. */
(() => {
 'use strict';
 const legacyCreate=createParty,legacyJoin=joinPartyByCode,legacyLeave=leaveParty;
 const legacyRenderMembers=renderPartyWorkspaceMembers,legacyLoadMembers=loadPartyMembers;
 const legacyOpenMeeting=openMeeting;
 const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const participantId=crypto.randomUUID();
 const outgoing=new Map(),incoming=new Map(),earlyCandidates=new Map();
 let channel=null,stream=null,shareId='',joining=false,members={},fallbackTimer=0,fallbackStarted=0,fallbackSending=false;
 const isLive=()=>Boolean(currentParty?.liveParty);
 window.aioPartyIdentity=()=>isLive()?participantId:(currentUser?.id||null);
 const codeFormat=code=>String(code||'').toUpperCase().replace(/[^A-Z2-9]/g,'');
 function makeCode(){const bytes=crypto.getRandomValues(new Uint8Array(20));return Array.from(bytes,x=>alphabet[x%alphabet.length]).join('')}
 function niceCode(code){return (code.match(/.{1,5}/g)||[]).join(' ')}
 function name(){return String($('partyGuestName')?.value||currentProfile?.username||'Guest').trim().slice(0,24)||'Guest'}
 function setText(id,value){const el=$(id);if(el)el.textContent=value}
 function safeTrack(){
  if(!channel||!isLive())return;
  const g=currentGame&&$('gameModal')?.classList.contains('open')?currentGame:null;
  channel.track({username:name(),guest:!currentUser,gameKey:g?gameKey(g):'',gameName:g?String(g.name).slice(0,80):'',sharing:!!stream,shareId}).catch(()=>{});
 }
 function send(event,payload){if(!channel||!isLive())return;return channel.send({type:'broadcast',event,payload:{...payload,from:participantId}})}
 function closeRecord(map,key){const item=map.get(key);if(!item)return;try{item.pc.close()}catch{}map.delete(key);}
 function removeVideo(key){document.getElementById('party-video-'+key)?.remove()}
 function renderMembers(){
  if(!isLive())return;
  const entries=Object.entries(members).map(([id,items])=>({id,...(Array.isArray(items)?items[items.length-1]:items)})).filter(m=>m.username);
  for(const id of ['partyMembers','partyWorkspaceMembers']){
   const box=$(id);if(!box)continue;box.replaceChildren();
   if(!entries.length){const msg=document.createElement('div');msg.className='tiny-status';msg.textContent='Waiting for players…';box.appendChild(msg);continue}
   entries.sort((a,b)=>a.id===participantId?-1:b.id===participantId?1:String(a.username).localeCompare(String(b.username)));
   for(const member of entries){
    const row=document.createElement('div');row.className='member-row';
    const info=document.createElement('div');info.className='row-fill';
    const title=document.createElement('strong');title.textContent=String(member.username).slice(0,24)+(member.id===participantId?' (you)':'');
    const sub=document.createElement('div');sub.className='tiny-status';sub.textContent=(member.guest?'Guest':'Member')+' · '+(member.gameName?'Playing '+String(member.gameName).slice(0,80):'Browsing')+(member.sharing?' · Sharing':'');
    info.append(title,sub);row.appendChild(info);
    if(member.id!==participantId&&member.gameKey){const index=GAMES.findIndex(game=>gameKey(game)===member.gameKey);if(index>=0){const button=document.createElement('button');button.className='btn mini';button.textContent='Play same';button.addEventListener('click',()=>openGame(index));row.appendChild(button)}}
    box.appendChild(row);
   }
  }
  setText('partyWorkspaceStatus',entries.length+' online · Invite anyone with your link');
 }
 function presenceSync(){
  if(!channel||!isLive())return;members=channel.presenceState()||{};renderMembers();
  const ids=new Set(Object.keys(members));
  for(const id of outgoing.keys())if(!ids.has(id))closeRecord(outgoing,id);
  for(const [key,entry] of incoming)if(!ids.has(entry.peer)){closeRecord(incoming,key);removeVideo(key)}
  if(stream)for(const id of ids)if(id!==participantId)startOutbound(id);
 }
 async function openRoom(code){
  if(joining)return;if(!supabaseClient){showToast('Party service is unavailable. Try again in a moment.');return}
  if(currentParty)await leaveParty();joining=true;
  const chan=supabaseClient.channel('aio-party-v2:'+code,{config:{presence:{key:participantId}}});channel=chan;
  currentParty={id:code,code,liveParty:true};
  chan.on('presence',{event:'sync'},presenceSync)
   .on('broadcast',{event:'draw'},({payload})=>receiveRemoteStroke(payload))
   .on('broadcast',{event:'draw-clear'},()=>clearCanvasLocal())
   .on('broadcast',{event:'screen-signal'},({payload})=>receiveSignal(payload))
   .on('broadcast',{event:'screen-frame'},({payload})=>receiveFallbackFrame(payload))
   .on('broadcast',{event:'screen-stop'},({payload})=>{if(payload?.from&&payload?.shareId){const key=payload.from+'-'+payload.shareId;closeRecord(incoming,key);removeVideo(key)}});
  const ok=await new Promise(resolve=>{let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value)};const timer=setTimeout(()=>finish(false),12000);chan.subscribe(status=>{if(status==='SUBSCRIBED')finish(true);else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')finish(false)})});
  joining=false;
  if(!ok||channel!==chan){if(channel===chan){channel=null;currentParty=null}await supabaseClient.removeChannel(chan);showToast('Could not connect to the party. Check your connection and try again.');return}
  communityChannels.set('party',chan);$('partyPanel')?.classList.remove('hidden');setText('partyCode',niceCode(code));setText('partyWorkspaceCode',niceCode(code));
  $('partyLiveControls')?.classList.remove('hidden');$('partyJoinCode').value=code;const own=$('partyWorkspaceJoinCode');if(own)own.value=code;
  try{localStorage.setItem('aio-party-name',name())}catch{}safeTrack();renderMembers();scrollToId('party-workspace');showToast('Party connected');
 }
 createParty=async function(){await openRoom(makeCode())};
 joinPartyByCode=async function(){
  const workspace=codeFormat($('partyWorkspaceJoinCode')?.value),community=codeFormat($('partyJoinCode')?.value);
  const raw=workspace||community;
  if(raw.length===6){if($('partyJoinCode'))$('partyJoinCode').value=raw;return legacyJoin()}
  if(raw.length!==20||Array.from(raw).some(x=>!alphabet.includes(x)))return showToast('Enter a valid party invite code.');
  await openRoom(raw);
 };
 leaveParty=async function(){
  if(!isLive())return legacyLeave();
  stopShare();for(const key of [...outgoing.keys()])closeRecord(outgoing,key);for(const key of [...incoming.keys()]){closeRecord(incoming,key);removeVideo(key)}earlyCandidates.clear();
  if(meetingChannel)closeMeeting();const old=channel;channel=null;communityChannels.delete('party');currentParty=null;members={};if(old)await supabaseClient.removeChannel(old);
  $('partyPanel')?.classList.add('hidden');$('partyLiveControls')?.classList.add('hidden');setText('partyCode','------');setText('partyWorkspaceCode','------');setText('partyWorkspaceStatus','Create or join a party below.');
  for(const id of ['partyMembers','partyWorkspaceMembers']){const el=$(id);if(el)el.textContent='No party joined.'}const grid=$('partyStreams');if(grid)grid.replaceChildren();showToast('Left party');
 };
 renderPartyWorkspaceMembers=async function(){if(isLive()){renderMembers();return}return legacyRenderMembers()};
 loadPartyMembers=async function(){if(isLive()){renderMembers();return}return legacyLoadMembers()};
 const originalOpenGame=openGame,originalCloseGame=closeGame;
 openGame=function(index){const result=originalOpenGame(index);safeTrack();return result};
 closeGame=function(){const result=originalCloseGame();safeTrack();return result};
 window.copyPartyInvite=async function(){if(!isLive())return showToast('Create or join a new party first.');const url=new URL(location.href);url.hash='party='+currentParty.code;try{await navigator.clipboard.writeText(url.href);showToast('Party invite copied')}catch{window.prompt('Copy this party invite:',url.href)}};
 function addVideo(key,media,label,local){
  const grid=$('partyStreams');if(!grid)return;let tile=document.getElementById('party-video-'+key);
  if(!tile){tile=document.createElement('div');tile.id='party-video-'+key;tile.className='aio-party-stream';const video=document.createElement('video');video.autoplay=true;video.playsInline=true;video.controls=true;video.muted=true;tile.appendChild(video);const caption=document.createElement('strong');tile.appendChild(caption);grid.appendChild(tile)}
  tile.querySelector('strong').textContent=label+(local?' · You':'');const video=tile.querySelector('video');video.srcObject=media;video.play().catch(()=>{});
 }
 async function startOutbound(peer){
  if(!stream||outgoing.has(peer)||!channel)return;
  const currentShare=shareId,pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});outgoing.set(peer,{pc,shareId:currentShare});
  stream.getTracks().forEach(track=>pc.addTrack(track,stream));
  pc.onicecandidate=e=>{if(e.candidate)send('screen-signal',{to:peer,shareId:currentShare,type:'candidate',candidate:e.candidate})};
  pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState))closeRecord(outgoing,peer)};
  try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);if(stream&&shareId===currentShare)await send('screen-signal',{to:peer,shareId:currentShare,type:'offer',description:pc.localDescription})}catch{closeRecord(outgoing,peer)}
 }
 async function receiveSignal(p){
  if(!isLive()||!p||p.to!==participantId||!p.from||p.from===participantId||!p.shareId||!['offer','answer','candidate'].includes(p.type))return;
  const key=p.from+'-'+p.shareId;
  try{
   if(p.type==='offer'){
    if(incoming.has(key))return;const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});incoming.set(key,{pc,peer:p.from});
    pc.onicecandidate=e=>{if(e.candidate)send('screen-signal',{to:p.from,shareId:p.shareId,type:'candidate',candidate:e.candidate})};
    pc.ontrack=e=>{const display=String(members[p.from]?.[0]?.username||'Party member').slice(0,24);addVideo(key,e.streams[0],display+' is sharing',false)};
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected'){const tile=document.getElementById('party-video-'+key);const img=tile?.querySelector('img'),video=tile?.querySelector('video');if(img)img.hidden=true;if(video)video.hidden=false}else if(pc.connectionState==='closed'){closeRecord(incoming,key);removeVideo(key)}};
    await pc.setRemoteDescription(p.description);for(const candidate of earlyCandidates.get(key)||[])await pc.addIceCandidate(candidate);earlyCandidates.delete(key);
    const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await send('screen-signal',{to:p.from,shareId:p.shareId,type:'answer',description:pc.localDescription});
   }else if(p.type==='answer'){
    const rec=outgoing.get(p.from);if(rec&&rec.shareId===p.shareId){await rec.pc.setRemoteDescription(p.description);for(const c of earlyCandidates.get(key)||[])await rec.pc.addIceCandidate(c);earlyCandidates.delete(key)}
   }else{
    const rec=incoming.get(key)||((outgoing.get(p.from)?.shareId===p.shareId)?outgoing.get(p.from):null);
    if(rec?.pc.remoteDescription)await rec.pc.addIceCandidate(p.candidate);else{const list=earlyCandidates.get(key)||[];if(list.length<60)list.push(p.candidate);earlyCandidates.set(key,list)}
   }
  }catch(error){console.warn('Party stream connection failed:',error);}
 }
 function receiveFallbackFrame(p){
  if(!isLive()||!p||p.from===participantId||!p.from||!p.shareId||!members[p.from]||typeof p.image!=='string'||p.image.length>80000||!p.image.startsWith('data:image/jpeg;base64,'))return;
  const key=p.from+'-'+p.shareId,record=incoming.get(key);
  if(record?.pc.connectionState==='connected')return;
  let tile=document.getElementById('party-video-'+key);
  if(!tile){addVideo(key,null,String(members[p.from]?.[0]?.username||'Party member').slice(0,24)+' is sharing',false);tile=document.getElementById('party-video-'+key)}
  if(!tile)return;let img=tile.querySelector('img');if(!img){img=document.createElement('img');img.alt='Live game preview';tile.insertBefore(img,tile.querySelector('strong'))}
  const video=tile.querySelector('video');if(video)video.hidden=true;img.hidden=false;img.src=p.image;
  tile.querySelector('strong').textContent=String(members[p.from]?.[0]?.username||'Party member').slice(0,24)+' is sharing · low-frame-rate view';
 }
 function startFallback(){
  clearInterval(fallbackTimer);fallbackStarted=Date.now();
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');
  fallbackTimer=setInterval(()=>{
   if(!stream||!channel||fallbackSending||Date.now()-fallbackStarted<5000)return;
   const needsFallback=Object.keys(members).some(id=>id!==participantId&&outgoing.get(id)?.pc.connectionState!=='connected');
   const video=$('partyStreams')?.querySelector('#party-video-local video');if(!needsFallback||!video||video.readyState<2||!ctx)return;
   try{ctx.drawImage(video,0,0,320,180);let frame=canvas.toDataURL('image/jpeg',.42);if(frame.length>80000)frame=canvas.toDataURL('image/jpeg',.2);if(frame.length<=80000){fallbackSending=true;Promise.resolve(send('screen-frame',{shareId,image:frame})).catch(()=>{}).finally(()=>{fallbackSending=false})}}catch{}
  },1000);
 }
 function stopShare(){
  if(!stream)return;clearInterval(fallbackTimer);fallbackTimer=0;fallbackSending=false;const old=stream,oldShare=shareId;stream=null;shareId='';send('screen-stop',{shareId:oldShare});old.getTracks().forEach(t=>t.stop());for(const id of [...outgoing.keys()])closeRecord(outgoing,id);removeVideo('local');safeTrack();setText('partyShareStatus','Choose Share game to let your party watch.');const b=$('partyShareButton');if(b)b.textContent='Share game';
 }
 window.togglePartyShare=async function(){
  if(!isLive())return showToast('Join a party first.');if(stream){stopShare();return}
  if(!navigator.mediaDevices?.getDisplayMedia)return showToast('Screen sharing is not available in this browser. Try a desktop browser.');
  try{const captured=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:20,max:30}},audio:true});if(!isLive()){captured.getTracks().forEach(t=>t.stop());return}stream=captured;shareId=crypto.randomUUID();const video=stream.getVideoTracks()[0];if(!video){stopShare();return}video.onended=stopShare;addVideo('local',stream,'Your screen',true);startFallback();setText('partyShareStatus','Sharing your selected screen with this party.');$('partyShareButton').textContent='Stop sharing';safeTrack();for(const peer of Object.keys(members))if(peer!==participantId)startOutbound(peer)}catch(error){if(error?.name!=='NotAllowedError')showToast('Screen sharing could not start in this browser.')}
 };
 // New rooms keep meetings available to guests using the same per-tab identity.
 openMeeting=async function(){return legacyOpenMeeting()};
 const input=$('partyWorkspaceJoinCode'),community=$('partyJoinCode');
 if(input&&community){input.addEventListener('input',()=>{community.value=input.value});community.addEventListener('input',()=>{input.value=community.value});input.addEventListener('keydown',e=>{if(e.key==='Enter')joinPartyByCode()});community.addEventListener('keydown',e=>{if(e.key==='Enter')joinPartyByCode()})}
 try{const saved=localStorage.getItem('aio-party-name');if(saved&&$('partyGuestName'))$('partyGuestName').value=saved}catch{}
 const invite=new URLSearchParams(location.hash.slice(1)).get('party');if(invite&&codeFormat(invite).length===20){if(input)input.value=codeFormat(invite);if(community)community.value=codeFormat(invite);setTimeout(()=>{scrollToId('party-workspace');showToast('Party invite ready — add a name and join.')},800)}
 addEventListener('pagehide',()=>{if(stream)stream.getTracks().forEach(t=>t.stop());for(const rec of outgoing.values())rec.pc.close();for(const rec of incoming.values())rec.pc.close()});
})();
