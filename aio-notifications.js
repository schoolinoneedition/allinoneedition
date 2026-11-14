/* Polite, floating on-site notices. Never requests system notification permission. */
(()=>{
 'use strict';
 const KEY='aio-notification-settings-v1';
 const THEMES=['glass','ocean','pumpkins','midnight'];
 const POSITIONS=['bottom-right','bottom-left'];
 const DEFAULTS={enabled:true,theme:'glass',position:'bottom-right',greetings:true,hometime:true};
 const parse=()=>{
  try{
   const data=JSON.parse(localStorage.getItem(KEY)||'{}');
   return {...DEFAULTS,
    enabled:data.enabled!==false,greetings:data.greetings!==false,hometime:data.hometime!==false,
    theme:THEMES.includes(data.theme)?data.theme:'glass',
    position:POSITIONS.includes(data.position)?data.position:'bottom-right'
   };
  }catch{return {...DEFAULTS}}
 };
 let config=parse(),root=null,sequence=0;
 const timers=new Map();
 const $=id=>document.getElementById(id);
 const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
 function ensureRoot(){
  if(root&&root.isConnected)return root;
  root=$('aioNotices')||make('div','aio-notices');
  root.id='aioNotices';
  root.setAttribute('aria-label','Site notifications');
  root.setAttribute('aria-live','polite');
  root.setAttribute('aria-relevant','additions');
  document.body.appendChild(root);
  root.dataset.position=config.position;
  return root;
 }
 function applySettings(){
  if(root)root.dataset.position=config.position;
  const section=$('aioNoticeSettings');
  if(section){
   for(const input of section.querySelectorAll('[data-aio-notification]')){
    const key=input.dataset.aioNotification;
    input.type==='checkbox'?input.checked=config[key]:input.value=config[key];
   }
  }
 }
 function setSettings(patch){
  if(!patch||typeof patch!=='object')return {...config};
  for(const key of ['enabled','greetings','hometime'])if(typeof patch[key]==='boolean')config[key]=patch[key];
  if(THEMES.includes(patch.theme))config.theme=patch.theme;
  if(POSITIONS.includes(patch.position))config.position=patch.position;
  try{localStorage.setItem(KEY,JSON.stringify(config))}catch{}
  applySettings();
  return {...config};
 }
 function removeNotice(node,immediate=false){
  if(!node||node.dataset.leaving==='1')return;
  const timeout=timers.get(node);
  if(timeout)clearTimeout(timeout);
  timers.delete(node);
  if(immediate||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   node.remove();return;
  }
  node.dataset.leaving='1';
  node.classList.add('aio-notice-leaving');
  setTimeout(()=>node.remove(),280);
 }
 function notify(title,message,options={}){
  if(config.enabled===false&&!options.force)return false;
  if(document.hidden&&!options.force)return false;
  const holder=ensureRoot();
  while(holder.children.length>=4)removeNotice(holder.firstElementChild,true);
  const card=make('div','aio-notice');
  card.dataset.theme=options.theme&&THEMES.includes(options.theme)?options.theme:config.theme;
  card.dataset.noticeId=String(++sequence);
  card.setAttribute('role','status');
  const picture=make('span','aio-notice-art');
  picture.setAttribute('aria-hidden','true');
  const content=make('div','aio-notice-content');
  const strong=make('strong','aio-notice-title',String(title||'All in One Edition').slice(0,70));
  const detail=make('span','aio-notice-detail',String(message||'').slice(0,240));
  content.append(strong,detail);
  const close=make('button','aio-notice-close','×');
  close.type='button';close.setAttribute('aria-label','Dismiss notification');
  const bar=make('span','aio-notice-progress');
  bar.setAttribute('aria-hidden','true');
  close.addEventListener('click',()=>removeNotice(card));
  card.append(picture,content,close,bar);
  holder.appendChild(card);
  if(card.animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   // CSS handles entrance. No scroll/DOM rearrangement.
  }
  const hold=options.force?6200:8000;
  timers.set(card,setTimeout(()=>removeNotice(card),hold));
  return true;
 }
 const once=key=>{try{if(localStorage.getItem(key))return false;localStorage.setItem(key,'1');return true}catch{return true}};
 const londonNow=now=>{
  const parts=new Intl.DateTimeFormat('en-GB',{
   timeZone:'Europe/London',weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false
  }).formatToParts(now);
  const field=kind=>parts.find(p=>p.type===kind)?.value||'';
  return {weekday:field('weekday'),date:field('year')+'-'+field('month')+'-'+field('day'),minutes:Number(field('hour'))*60+Number(field('minute'))};
 };
 function timeCheck(now=new Date()){
  if(document.hidden||!config.enabled||!config.hometime)return;
  const london=londonNow(now);
  if(london.weekday==='Sat'||london.weekday==='Sun')return;
  if(london.minutes>=890&&london.minutes<930&&once('aio-hometime-soon-'+london.date))
   notify('Nearly hometime','40 minutes or less until 15:30 (UK time).');
  if(london.minutes>=930&&london.minutes<960&&once('aio-hometime-now-'+london.date))
   notify('Hometime','It is 15:30 in the UK. Enjoy the rest of your day!');
 }
 function preview(theme){
  return notify('Your notification preview','Floating alerts appear here with the selected cover.',{force:true,theme});
 }
 function section(){
  const body=document.querySelector('#settingsModal .settings-body');
  if(!body||$('aioNoticeSettings'))return;
  const card=make('section','aio-notice-settings');card.id='aioNoticeSettings';
  const heading=make('h3','','Floating notifications');
  const explainer=make('p','','Control welcome and hometime notices. No browser permission is needed.');
  const controls=[
   ['enabled','Show on-site notices','checkbox'],
   ['greetings','Show welcome greetings','checkbox'],
   ['hometime','40-minute and 15:30 hometime alerts','checkbox'],
   ['theme','Notification cover','select',[['glass','Clean glass'],['ocean','Ocean waves'],['pumpkins','Pumpkin season'],['midnight','Night sky']]],
   ['position','Position','select',[['bottom-right','Bottom right'],['bottom-left','Bottom left']]]
  ];
  card.append(heading,explainer);
  for(const [key,label,type,opts] of controls){
   const row=make('label','aio-notice-setting-row');
   const text=make('span','',label);
   let input;
   if(type==='checkbox'){input=make('input');input.type='checkbox';input.checked=Boolean(config[key])}
   else{
    input=make('select');
    for(const [value,name] of opts){const option=make('option','',name);option.value=value;input.appendChild(option)}
    input.value=config[key];
   }
   input.dataset.aioNotification=key;
   input.setAttribute('aria-label',label);
   input.addEventListener('change',()=>{setSettings({[key]:type==='checkbox'?input.checked:input.value})});
   row.append(text,input);card.appendChild(row);
  }
  const tryIt=make('button','btn mini','Preview notification');
  tryIt.type='button';tryIt.addEventListener('click',()=>preview());
  card.appendChild(tryIt);
  body.appendChild(card);
  applySettings();
 }
 function greeting(){
  if(!config.greetings)return;
  let username='Guest';
  try{
   const profile=typeof currentProfile!=='undefined'?currentProfile:null;
   const user=typeof currentUser!=='undefined'?currentUser:null;
   username=String(profile?.username||user?.user_metadata?.username||'Guest').slice(0,24);
  }catch{}
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
  notify(hour<12?'Good morning':hour<17?'Good afternoon':'Good evening','Welcome, '+username+'!');
 }
 function start(){
  ensureRoot();section();
  setTimeout(()=>{greeting();timeCheck()},7800);
  setInterval(timeCheck,30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)timeCheck()});
  document.addEventListener('click',event=>{if(event.target?.closest?.('#settingsBtn'))setTimeout(section,0)});
 }
 window.AIONotifications={notify,preview,setSettings,getSettings:()=>({...config}),timeCheck,londonNow};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
