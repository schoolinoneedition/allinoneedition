/* Explore real cloud gaming services without pretending AIO runs their games.
   Official providers retain their own sessions, accounts, libraries and pricing. */
(()=>{
 'use strict';
 const root=document.getElementById('cloud-gaming'),grid=root?.querySelector('.aio-cloud-grid');
 if(!grid||document.getElementById('aioCloudLibrary'))return;
 const services=Object.freeze([
  {id:'geforce',name:'GeForce NOW',tag:'Free tier available',tier:'free',url:'https://play.geforcenow.com/',note:'Cloud PC games on supported devices. Free accounts can queue; game ownership and publisher support vary.',icon:'G'},
  {id:'xbox',name:'Xbox Cloud Gaming',tag:'Selected free games',tier:'free',url:'https://www.xbox.com/en-GB/play',note:'Fortnite can be cloud-played with a free Microsoft account. Most other games need an eligible Game Pass plan.',icon:'X'},
  {id:'luna',name:'Amazon Luna',tag:'With eligible Prime',tier:'membership',url:'https://luna.amazon.com/',note:'Browse rotating cloud games with an eligible Amazon Prime membership in the UK.',icon:'L'}
 ]);
 const find=id=>services.find(service=>service.id===id)||null;
 const make=(tag,cls,value)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(value!==undefined)el.textContent=value;
  return el;
 };
 const area=make('section','aio-cloud-library');
 area.id='aioCloudLibrary';area.setAttribute('aria-labelledby','aioCloudLibraryTitle');
 const top=make('div','aio-cloud-library-top');
 const intro=make('div','aio-cloud-library-title');
 const kicker=make('span','aio-cloud-library-kicker','MORE CLOUD GAME LIBRARIES');
 const h3=make('h3','', 'Explore more cloud games');
 h3.id='aioCloudLibraryTitle';
 const p=make('p','', 'These providers stream games on their own systems. Browse their libraries in a new tab. No provider lets this site start your private gaming PC automatically.');
 intro.append(kicker,h3,p);
 const summary=make('p','aio-cloud-library-summary','');
 summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');
 top.append(intro,summary);
 const filters=make('div','aio-cloud-library-filters');
 const all=make('button','aio-cloud-library-filter','All options');
 const free=make('button','aio-cloud-library-filter','Free tier / free game');
 const membership=make('button','aio-cloud-library-filter','With membership');
 const favourites=make('button','aio-cloud-library-filter','Favourites');
 for(const [btn,id] of [[all,'all'],[free,'free'],[membership,'membership'],[favourites,'favourites']]){
  btn.type='button';btn.dataset.cloudFilter=id;
  btn.setAttribute('aria-pressed',String(id==='all'));filters.appendChild(btn);
 }
 const search=make('input','aio-cloud-library-search');
 search.type='search';search.placeholder='Search cloud providers';
 search.setAttribute('aria-label','Search cloud gaming services');
 search.autocomplete='off';search.maxLength=90;
 const controls=make('div','aio-cloud-library-controls');controls.append(filters,search);
 const cards=make('div','aio-cloud-library-grid');
 const empty=make('p','aio-cloud-library-empty','No matching services. Clear the search or switch filters.');
 empty.hidden=true;
 const reminder=make('p','aio-cloud-library-fine','Opening a provider uses its own website and sign-in. The free options are not unlimited, and game compatibility changes. All in One Edition never asks for those account passwords.');
 const key='aio-cloud-service-favourites-v1';
 let saved=[],filter='all',query='';
 try{const raw=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(raw))saved=raw.filter(id=>Boolean(find(id))).slice(0,services.length)}catch{}
 const cardById=new Map();
 const favorites=new Map();
 const recently=new Map();
 for(const service of services){
  const card=make('article','aio-cloud-library-card');card.dataset.service=service.id;
  const row=make('div','aio-cloud-library-card-row');
  const avatar=make('span','aio-cloud-library-avatar',service.icon);avatar.setAttribute('aria-hidden','true');
  const details=make('div','aio-cloud-library-card-name');
  const name=make('h4','',service.name);
  const tier=make('span','aio-cloud-library-tier',service.tag);
  details.append(name,tier);
  const fav=make('button','aio-cloud-library-star','☆');
  fav.type='button';fav.dataset.favourite=service.id;
  fav.setAttribute('aria-label','Save '+service.name+' to favourites');
  fav.setAttribute('aria-pressed','false');
  row.append(avatar,details,fav);
  const description=make('p','',service.note);
  const launch=make('a','btn mini primary','Browse games ↗');
  launch.href=service.url;launch.target='_blank';launch.rel='noopener noreferrer';
  launch.dataset.launchService=service.id;
  launch.setAttribute('aria-label','Open '+service.name+' in a new tab');
  const foot=make('div','aio-cloud-library-card-foot');foot.appendChild(launch);
  card.append(row,description,foot);cards.appendChild(card);cardById.set(service.id,card);favorites.set(service.id,fav);recently.set(service.id,launch);
 }
 function save(){
  try{localStorage.setItem(key,JSON.stringify(saved))}catch{}
 }
 function render(){
  const term=query.toLocaleLowerCase();
  let visible=0;
  for(const service of services){
   const matchesFilter=filter==='all'||(filter==='favourites'?saved.includes(service.id):filter===service.tier);
   const matchesSearch=!term||[service.name,service.tag,service.note].some(text=>text.toLowerCase().includes(term));
   const card=cardById.get(service.id);
   card.hidden=!(matchesFilter&&matchesSearch);
   if(!card.hidden)visible++;
   const starred=saved.includes(service.id),b=favorites.get(service.id);
   b.textContent=starred?'★':'☆';b.setAttribute('aria-pressed',String(starred));
   b.setAttribute('aria-label',(starred?'Remove ':'Save ')+service.name+(starred?' from favourites':' to favourites'));
  }
  for(const b of [all,free,membership,favourites])b.setAttribute('aria-pressed',String(b.dataset.cloudFilter===filter));
  empty.hidden=visible!==0;
  summary.textContent=visible+' cloud '+(visible===1?'option':'options')+' shown';
 }
 filters.addEventListener('click',event=>{
  const id=event.target?.closest?.('[data-cloud-filter]')?.dataset.cloudFilter;
  if(!['all','free','membership','favourites'].includes(id))return;
  filter=id;render();
 });
 search.addEventListener('input',()=>{query=String(search.value||'').slice(0,90);render()});
 cards.addEventListener('click',event=>{
  const favourite=event.target?.closest?.('[data-favourite]')?.dataset.favourite;
  if(favourite&&find(favourite)){
   saved=saved.includes(favourite)?saved.filter(x=>x!==favourite):[...saved,favourite];
   save();render();return;
  }
  const launched=event.target?.closest?.('[data-launch-service]')?.dataset.launchService;
  if(find(launched))summary.textContent='Opening '+find(launched).name+' in a new tab. The provider controls the game session.';
 });
 area.append(top,controls,cards,empty,reminder);
 grid.after(area);
 render();
 window.aioCloudLibrary={ids:()=>services.map(s=>s.id),filter:id=>{if(!['all','free','membership','favourites'].includes(id))return false;filter=id;render();return true}};
})();
