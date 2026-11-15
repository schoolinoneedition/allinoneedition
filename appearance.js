(()=> {
'use strict';
const KEY='aio-appearance-v1';
const defaults={font:'inter',headingFont:'default',theme:'standard',wallpaper:'default',cursor:true,cursorStyle:'chatgpt',cursorSize:28,cursorColor:'#2563eb',cursorFavourites:[],navPosition:'top',fit:'cover',position:'center',dim:0,overlay:0};
const wallpapers=[
{id:'default',name:'Default',bg:'linear-gradient(135deg,#f7f7f8 0%,#e8edf7 100%)'},
{id:'blue',name:'Blue hour',bg:'linear-gradient(135deg,#0f172a 0%,#1d4ed8 52%,#8b5cf6 100%)'},
{id:'sunset',name:'Soft sunset',bg:'linear-gradient(135deg,#fbc2a8 0%,#f6d8b8 45%,#c8c8f2 100%)'},
{id:'aurora',name:'Aurora',bg:'radial-gradient(ellipse at 15% 20%,#42e8c5 0%,transparent 45%),radial-gradient(ellipse at 80% 25%,#5a68ed 0%,transparent 48%),linear-gradient(135deg,#10152d,#151b3d 60%,#291b4a)'},
{id:'midnight',name:'Midnight',bg:'linear-gradient(135deg,#05070f 0%,#171b2d 55%,#28334d 100%)'},
{id:'rose',name:'Rose glass',bg:'radial-gradient(ellipse at top left,#ffd1dc,transparent 55%),linear-gradient(135deg,#e6d9ff,#f9e7ef 55%,#d6e8ff)'},
{id:'forest',name:'Forest',bg:'radial-gradient(ellipse at 25% 20%,#8ccf9a,transparent 48%),linear-gradient(145deg,#12382d,#24634d 55%,#8aa879)'},
{id:'ocean',name:'Ocean',bg:'radial-gradient(ellipse at 75% 20%,#b0f1f2,transparent 42%),linear-gradient(145deg,#0c3150,#087e9b 55%,#80d8d0)'},
{id:'deepsea',name:'Deep sea',bg:'radial-gradient(ellipse at 60% -10%,#52cadc76,transparent 42%),repeating-radial-gradient(ellipse at 80% 120%,#1a9fba29 0 2px,transparent 4px 24px),linear-gradient(170deg,#072139,#0b5874 68%,#042339)'},
{id:'pumpkin',name:'Pumpkin twilight',bg:'radial-gradient(ellipse at 82% 13%,#ffad715e,transparent 38%),radial-gradient(ellipse at 15% 86%,#b7514b4a,transparent 40%),linear-gradient(135deg,#392037,#984e39 55%,#261e35)'},
{id:'starlight',name:'Starlight',bg:'radial-gradient(circle at 22% 28%,#cfcaff 0 1px,transparent 2px),radial-gradient(circle at 75% 19%,#e4d9ff 0 1px,transparent 2px),radial-gradient(circle at 70% 73%,#bfaeff 0 1px,transparent 2px),linear-gradient(135deg,#121734,#353062 60%,#17172c)'},
{id:'mountain',name:'Mountain dusk',bg:'linear-gradient(180deg,#f7bfa3 0%,#8e9fc4 48%,#26344c 100%),linear-gradient(135deg,#283c5a,#111827)'},
{id:'arcade',name:'Arcade neon',bg:'radial-gradient(ellipse at 20% 20%,#ff4dd2,transparent 35%),radial-gradient(ellipse at 80% 70%,#00d7ff,transparent 40%),linear-gradient(135deg,#11112b,#21123f)'},
{id:'paper',name:'Warm paper',bg:'linear-gradient(135deg,#fff8e8,#eadfc9)'},
{id:'slate',name:'Slate',bg:'linear-gradient(135deg,#334155,#64748b 50%,#cbd5e1)'}
];
let state=load(), customUrl='',dbPromise;
function load(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');return {...defaults,...raw};}catch{return {...defaults};}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new Event('aio-preferences-changed'));}catch{status('Some settings could not be saved by this browser.');}}
function $(id){return document.getElementById(id)}
function status(s){const el=$('aioAppearanceStatus');if(el)el.textContent=s||''}
function fontLink(){let l=$('aioCherryFontLink');if(!l){l=document.createElement('link');l.id='aioCherryFontLink';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Cherry+Bomb+One&display=swap';document.head.appendChild(l);}}
function nunitoFontLink(){let l=$('aioNunitoFontLink');if(!l){l=document.createElement('link');l.id='aioNunitoFontLink';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap';document.head.appendChild(l);}}
function applyFont(){const root=document.documentElement;state.font=['system','inter','nunito','cherry','sakura'].includes(state.font)?state.font:'inter';state.headingFont=state.headingFont==='cherry'?'cherry':'default';root.dataset.aioFont=state.font;root.dataset.aioHeadingFont=state.headingFont;if(state.font==='cherry'||state.headingFont==='cherry')fontLink();if(state.font==='nunito')nunitoFontLink();updateFontPreview();}
function updateFontPreview(){const s=$('aioFontSelect'),preview=$('aioFontPreview');if(!s||!preview)return;const font=s.value;preview.style.fontFamily=font==='system'?'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif':font==='cherry'?'"Cherry Bomb One",system-ui,sans-serif':font==='nunito'?'Nunito,system-ui,sans-serif':font==='sakura'?'"Sakura",Georgia,serif':'Inter,ui-sans-serif,system-ui,sans-serif';const active=$('aioFontActive');if(active)active.textContent='Selected: '+s.options[s.selectedIndex].text+(font==='sakura'?' (fallback until a verified source is available)':'');}
function bgCss(w){if(w)return w.bg;if(state.wallpaper==='custom'&&customUrl)return 'url("'+customUrl.replace(/["\\]/g,'')+'")';return wallpapers[0].bg}
function applyWallpaper(){const root=document.documentElement;const w=wallpapers.find(x=>x.id===state.wallpaper);const active=state.wallpaper!=='default'&&(state.wallpaper!=='custom'||!!customUrl);if(state.wallpaper==='custom'&&customUrl)root.style.setProperty('--aio-wallpaper-layer','url("'+customUrl.replace(/["\\]/g,'')+'")');else if(state.wallpaper==='default'||(state.wallpaper==='custom'&&!customUrl)){root.style.setProperty('--aio-wallpaper-layer','none')}else root.style.setProperty('--aio-wallpaper-layer',bgCss(w));root.dataset.aioWallpaperActive=active?'1':'0';root.dataset.aioWallpaperFit=state.fit||'cover';root.style.setProperty('--aio-wallpaper-position',state.position||'center');root.style.setProperty('--aio-wallpaper-dim',String(Math.max(0,Math.min(.7,Number(state.dim)||0))));root.style.setProperty('--aio-wallpaper-opacity',String(1-Math.max(0,Math.min(.45,Number(state.overlay)||0))));}
function applyTheme(){state.theme=state.theme==='glass'?'glass':'standard';document.documentElement.dataset.aioTheme=state.theme;}
const cursorPacks=[
 {id:'default',name:'System',category:'Classic',color:'#ffffff'},
 {id:'minimal',name:'Paper',category:'Minimal',color:'#ffffff'},
 {id:'chatgpt',name:'Ink',category:'Minimal',color:'#172033'},
 {id:'ocean',name:'Ocean',category:'Colourful',color:'#16b8ca'},
 {id:'neon',name:'Neon mint',category:'Neon',color:'#74f9bc'},
 {id:'pixel',name:'Pixel',category:'Pixel',color:'#84b6ff'},
 {id:'gaming',name:'Arcade',category:'Gaming',color:'#ff9665'},
 {id:'sakura',name:'Petal',category:'Anime-inspired',color:'#f6a5ca'},
 {id:'glass',name:'Frost',category:'Liquid Glass',color:'#c9e9ff'},
 {id:'custom',name:'Your colour',category:'Custom',color:'#2563eb'},
 {id:'upload',name:'Your image',category:'Custom',color:'#2563eb'}
];
function cursorImage(id,hand=false,size=40){
 if(id==='upload'){const src=state.cursorUpload?.[hand?'hand':'normal']?.[size]||state.cursorUpload?.normal?.[size];if(typeof src==='string'&&src.length<40000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src))return src;}
 const pack=cursorPacks.find(p=>p.id===id)||cursorPacks[0];
 const fill=id==='custom'&&/^#[0-9a-f]{6}$/i.test(state.cursorColor)?state.cursorColor:pack.color;
 const arrow=id==='pixel'?'M4 3h4v4h4v4h4v4h4v4h-8v10H8V19H4Z':id==='gaming'?'M4 3 26 16 15 18 11 29Z':'M4 3 4 26 11 20 16 30 21 27 16 18 27 18Z';
 const path=hand?'M12 29 5 20Q3 16 6 15L11 18V5Q11 1 15 3V14 11Q19 9 20 13Q24 11 25 16Q29 15 29 20L26 29Z':arrow;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 34 34"><path d="'+path+'" fill="'+fill+'" stroke="#101828" stroke-width="3" stroke-linejoin="round"/><path d="'+path+'" fill="'+fill+'" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>'+(id==='sakura'?'<circle cx="10" cy="14" r="2" fill="#fff"/>':'')+'</svg>';
 return 'data:image/svg+xml,'+encodeURIComponent(svg);
}
function applyCursor(){
 const root=document.documentElement;
 if(!cursorPacks.some(p=>p.id===state.cursorStyle))state.cursorStyle=state.cursor===false?'default':'chatgpt';
 const size=[20,28,36,48].includes(Number(state.cursorSize))?Number(state.cursorSize):28;
 const hx=state.cursorStyle==='upload'?Math.round(Math.max(0,Math.min(47,Number(state.cursorHotspotX)||0))*size/48):Math.round(size*4/34);
 const hy=state.cursorStyle==='upload'?Math.round(Math.max(0,Math.min(47,Number(state.cursorHotspotY)||0))*size/48):Math.round(size*3/34);
 root.dataset.aioMinimalCursor=state.cursorStyle!=='default'?'1':'0';
 root.dataset.aioCursorStyle=state.cursorStyle;
 root.style.setProperty('--aio-pointer', 'url("'+cursorImage(state.cursorStyle,false,size)+'") '+hx+' '+hy+', default');
 root.style.setProperty('--aio-hand', 'url("'+cursorImage(state.cursorStyle,true,size)+'") '+(state.cursorStyle==='upload'?hx:Math.round(size*13/34))+' '+hy+', pointer');
 document.querySelectorAll('[data-aio-cursor-gallery]').forEach(gallery=>{
  gallery.querySelectorAll('[data-cursor-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cursorChoice===state.cursorStyle)));
 });
}
function mountCursorGallery(parent,onChoice){
 const gallery=document.createElement('div');gallery.className='aio-cursor-gallery';gallery.dataset.aioCursorGallery='1';
 const controls=document.createElement('div');controls.className='aio-cursor-controls';
 const size=document.createElement('select');size.setAttribute('aria-label','Cursor size');
 for(const [v,label] of [[20,'Small'],[28,'Medium'],[36,'Large'],[48,'Extra large']]){const o=document.createElement('option');o.value=v;o.textContent=label;size.append(o)}size.value=state.cursorSize||28;
 size.onchange=()=>{state.cursorSize=Number(size.value);save();applyCursor()};
 const colour=document.createElement('input');colour.type='color';colour.value=state.cursorColor||'#2563eb';colour.setAttribute('aria-label','Custom cursor colour');
 colour.onchange=()=>{state.cursorColor=colour.value;state.cursorStyle='custom';state.cursor=true;save();applyCursor();draw();onChoice?.('custom')};
 const filter=document.createElement('select');filter.setAttribute('aria-label','Cursor category');
 for(const name of ['All','Favourites',...new Set(cursorPacks.map(p=>p.category))]){const o=document.createElement('option');o.textContent=name;o.value=name;filter.append(o)}
 const reset=button('Use system cursor',()=>choose('default'));
 controls.append(size,colour,filter,reset);
 const cards=document.createElement('div');cards.className='aio-cursor-cards';
 const test=document.createElement('div');test.className='aio-cursor-test';test.textContent='Try your pointer here. ';
 const testButton=button('Test clickable pointer',()=>{testButton.textContent='Click works';setTimeout(()=>testButton.textContent='Test clickable pointer',1200)});test.append(testButton);
 const note=document.createElement('p');note.className='aio-onboard-note';note.textContent='Original AIO pointers. Text and resize cursors stay native. Embedded games may use their own pointer. Your choices stay on this device.';
 const source=document.createElement('a');source.href='https://sweezy-cursors.com/';source.target='_blank';source.rel='noopener noreferrer';source.textContent='Explore Sweezy for your browser or desktop';
 function choose(id){state.cursorStyle=id;state.cursor=id!=='default';save();applyCursor();draw();const selector=$('aioCursorStyleSelect');if(selector)selector.value=id;onChoice?.(id)}
 function draw(){cards.replaceChildren();const favourites=Array.isArray(state.cursorFavourites)?state.cursorFavourites:[];
  for(const pack of cursorPacks){if(filter.value==='Favourites'&&!favourites.includes(pack.id)||!['All','Favourites',pack.category].includes(filter.value))continue;
   const card=document.createElement('article');card.className='aio-cursor-pack';
   const pick=document.createElement('button');pick.type='button';pick.dataset.cursorChoice=pack.id;pick.setAttribute('aria-pressed',String(pack.id===state.cursorStyle));pick.setAttribute('aria-label','Apply '+pack.name+' cursor');
   const preview=document.createElement('span');preview.className='aio-cursor-images';
   for(const hand of [false,true]){const img=document.createElement('img');img.src=cursorImage(pack.id,hand);img.alt=pack.name+(hand?' clickable pointer':' normal pointer');img.width=40;img.height=40;preview.append(img)}
   const title=document.createElement('strong');title.textContent=pack.name;const category=document.createElement('small');category.textContent=pack.category;
   pick.append(preview,title,category);pick.onclick=()=>choose(pack.id);
   const fav=button(favourites.includes(pack.id)?'Saved':'Save',()=>{state.cursorFavourites=favourites.includes(pack.id)?favourites.filter(id=>id!==pack.id):[...favourites,pack.id];save();draw()});fav.setAttribute('aria-label','Favourite '+pack.name);fav.setAttribute('aria-pressed',String(favourites.includes(pack.id)));
   card.append(pick,fav);cards.append(card);
  }
  if(!cards.children.length){const empty=document.createElement('p');empty.textContent='No saved cursors yet. Choose All to save a favourite.';cards.append(empty)}
 }
 const upload=document.createElement('div');upload.className='aio-cursor-upload';
 const message=document.createElement('p');message.setAttribute('role','status');message.textContent='Upload your own PNG or WebP, up to 256 KB and 512 � 512 pixels. Transparent images work best. Files stay on this device.';
 for(const [kind,label] of [['normal','Normal cursor image'],['hand','Clickable pointer image (optional)']]){
  const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='file';input.accept='image/png,image/webp';input.setAttribute('aria-label',label);wrap.append(input);upload.append(wrap);
  input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{
   if(!['image/png','image/webp'].includes(file.type)||file.size>262144)throw Error('Choose a PNG or WebP under 256 KB.');
   const bitmap=await createImageBitmap(file);if(bitmap.width>512||bitmap.height>512){bitmap.close();throw Error('Use an image no larger than 512 � 512.');}
   const sizes={};try{for(const size of [20,28,36,40,48]){const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');const ratio=Math.min(size/bitmap.width,size/bitmap.height);ctx.drawImage(bitmap,0,0,bitmap.width*ratio,bitmap.height*ratio);sizes[size]=canvas.toDataURL('image/png')}}finally{bitmap.close()}
   state.cursorUpload={...state.cursorUpload,[kind]:sizes};choose('upload');message.textContent='Image ready. Adjust the click point below to match the tip.';
  }catch(error){message.textContent=error.message||'This image could not be opened.'}finally{input.value=''}};
 }
 for(const [axis,key] of [['X','cursorHotspotX'],['Y','cursorHotspotY']]){const label=document.createElement('label');label.textContent='Click point '+axis+' (0-47)';const input=document.createElement('input');input.type='number';input.min='0';input.max='47';input.value=state[key]||0;input.setAttribute('aria-label','Cursor click point '+axis);input.onchange=()=>{state[key]=Math.max(0,Math.min(47,Number(input.value)||0));save();applyCursor()};label.append(input);upload.append(label)}
 upload.append(message,button('Remove uploaded cursor',()=>{delete state.cursorUpload;delete state.cursorHotspotX;delete state.cursorHotspotY;choose('default');message.textContent='Uploaded images removed from this device.'}));
 filter.onchange=draw;gallery.append(controls,cards,test,upload,note,source);parent.append(gallery);draw();
}

function db(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve,reject)=>{if(!('indexedDB'in window))return reject(Error('IndexedDB unavailable'));const r=indexedDB.open('aio-appearance-media',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('wallpapers'))r.result.createObjectStore('wallpapers')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Database unavailable'));});return dbPromise}
async function getCustom(){try{const d=await db();const blob=await new Promise((resolve,reject)=>{const tx=d.transaction('wallpapers','readonly');const r=tx.objectStore('wallpapers').get('custom');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});if(blob instanceof Blob){if(customUrl)URL.revokeObjectURL(customUrl);customUrl=URL.createObjectURL(blob);if(state.wallpaper==='custom')applyWallpaper();}}catch{}}
async function saveCustom(blob){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('wallpapers','readwrite');tx.objectStore('wallpapers').put(blob,'custom');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Could not save image'));});}
async function removeCustom(){try{const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('wallpapers','readwrite');tx.objectStore('wallpapers').delete('custom');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});}catch{}if(customUrl){URL.revokeObjectURL(customUrl);customUrl='';}}
function section(title,desc,id){const el=document.createElement('section');el.className='aio-appearance-section';el.id=id;const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=desc;el.append(h,p);return el}
function row(parent,label,control,description){const wrap=document.createElement('div');wrap.className='aio-appearance-row';const text=document.createElement('div');const strong=document.createElement('strong');strong.textContent=label;text.append(strong);if(description){const small=document.createElement('div');small.className='muted';small.style.fontSize='11px';small.textContent=description;text.append(small)}wrap.append(text,control);parent.append(wrap);return control}
function select(options,value,id){const s=document.createElement('select');s.id=id;for(const [v,t] of options){const o=document.createElement('option');o.value=v;o.textContent=t;s.append(o)}s.value=value;return s}
function button(label,fn,primary=false){const b=document.createElement('button');b.type='button';b.className='btn mini'+(primary?' primary':'');b.textContent=label;b.addEventListener('click',fn);return b}
function switcher(checked,label,id){const l=document.createElement('label');l.className='switch';l.setAttribute('aria-label',label);const i=document.createElement('input');i.type='checkbox';i.id=id;i.checked=checked;const s=document.createElement('span');l.append(i,s);return l}
function build(){
 const body=document.querySelector('#settingsModal .settings-body');if(!body||$('aioAppearanceRoot'))return;
 const root=document.createElement('div');root.id='aioAppearanceRoot';root.className='aio-appearance';
 const cursor=section('Cursor','Choose a distinct native or lightweight custom pointer. Cross-origin games may control their own cursor inside the embedded frame.','aioCursorSection');
 const cursorSel=select(cursorPacks.map(p=>[p.id,p.name]),state.cursorStyle||(state.cursor?'minimal':'default'),'aioCursorStyleSelect');row(cursor,'Cursor style',cursorSel,'Text fields keep a text cursor; links and buttons remain clickable.');root.append(cursor);mountCursorGallery(cursor);
 const theme=section('Theme','Switch between the standard hub and a translucent Liquid Glass appearance.','aioThemeSection');
 const themeSel=select([['standard','Standard'],['glass','Liquid Glass']],state.theme,'aioThemeSelect');row(theme,'Appearance theme',themeSel,'Glass blur is reduced automatically when unsupported.');root.append(theme);
 const fonts=section('Fonts','Preview before applying. Cherry Bomb One loads from the official Google Fonts CSS endpoint.','aioFontsSection');
 const fs=select([['system','Default system font'],['inter','Inter / modern sans-serif'],['nunito','Nunito'],['cherry','Cherry Bomb One'],['sakura','Sakura (fallback)']],state.font,'aioFontSelect');
 row(fonts,'Website font',fs,'Decorative fonts fall back safely if unavailable.');
 const heading=switcher(state.headingFont==='cherry','Use Cherry Bomb One for headings only','aioHeadingFontToggle');row(fonts,'Decorative headings',heading,'Keep body text readable while using a decorative heading font.');
 const active=document.createElement('div');active.id='aioFontActive';active.className='aio-appearance-status';fonts.append(active);
 const prev=document.createElement('div');prev.id='aioFontPreview';prev.className='aio-font-preview';prev.innerHTML='<h4>All in One Edition</h4><p>The quick brown fox jumps over the lazy dog. Preview your chosen font before applying it to the website.</p><button type="button">Preview button</button>';fonts.append(prev);
 const actions=document.createElement('div');actions.className='aio-appearance-row';actions.append(button('Apply font',()=>{state.font=fs.value;state.headingFont=heading.querySelector('input').checked?'cherry':'default';save();applyFont();status('Font preference applied.');},true),button('Reset font',()=>{state.font='inter';state.headingFont='default';fs.value='inter';heading.querySelector('input').checked=false;save();applyFont();status('Font reset to Inter.');}));fonts.append(actions);root.append(fonts);
 const wall=section('Wallpapers','Choose a built-in gradient or upload your own image. Uploads are stored as a Blob in this browser, not as base64 in localStorage.','aioWallpapersSection');
 const gallery=document.createElement('div');gallery.className='aio-wallpaper-gallery';gallery.id='aioWallpaperGallery';
 wallpapers.forEach(w=>{const b=document.createElement('button');b.type='button';b.className='aio-wallpaper-option';b.dataset.wallpaper=w.id;b.setAttribute('aria-pressed',String(state.wallpaper===w.id));const thumb=document.createElement('span');thumb.className='aio-wallpaper-thumb';thumb.style.setProperty('--aio-thumb',w.bg);const name=document.createElement('span');name.textContent=w.name;b.append(thumb,name);b.addEventListener('click',()=>{state.pendingWallpaper=w.id;selectWallpaper(w.id)});gallery.append(b)});
 const custom=document.createElement('button');custom.type='button';custom.className='aio-wallpaper-option';custom.dataset.wallpaper='custom';custom.setAttribute('aria-pressed',String(state.wallpaper==='custom'));const thumb=document.createElement('span');thumb.className='aio-wallpaper-thumb';thumb.style.setProperty('--aio-thumb','linear-gradient(135deg,#64748b,#cbd5e1)');const nm=document.createElement('span');nm.textContent='Custom image';custom.append(thumb,nm);custom.addEventListener('click',()=>{if(!customUrl)return status('Upload an image first.');state.pendingWallpaper='custom';selectWallpaper('custom')});gallery.append(custom);wall.append(gallery);
 const preview=document.createElement('div');preview.id='aioWallpaperPreview';preview.className='aio-wallpaper-preview';preview.textContent='Wallpaper preview';wall.append(preview);
 const file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/webp,image/avif';file.id='aioWallpaperFile';file.setAttribute('aria-label','Upload a wallpaper image');file.addEventListener('change',uploadWallpaper);row(wall,'Upload custom image (PNG, JPEG, WebP, AVIF; max 8 MB)',file,'Images stay on this device using IndexedDB.'); 
 const fit=select([['cover','Cover'],['contain','Contain']],state.fit,'aioWallpaperFit');row(wall,'Image fitting',fit,'Applies to uploaded images and background artwork.');fit.addEventListener('change',()=>{state.fit=fit.value;save();applyWallpaper()});
 const pos=select([['center','Center'],['top','Top'],['bottom','Bottom'],['left','Left'],['right','Right']],state.position,'aioWallpaperPosition');row(wall,'Background position',pos);pos.addEventListener('change',()=>{state.position=pos.value;save();applyWallpaper()});
 const dim=document.createElement('input');dim.type='range';dim.min='0';dim.max='.7';dim.step='.05';dim.value=state.dim;dim.id='aioWallpaperDim';row(wall,'Readability dimming',dim,'Darkens the wallpaper layer without covering content.');dim.addEventListener('input',()=>{state.dim=Number(dim.value);save();applyWallpaper()});
 const overlay=document.createElement('input');overlay.type='range';overlay.min='0';overlay.max='.45';overlay.step='.05';overlay.value=state.overlay;row(wall,'Wallpaper softness',overlay,'Subtle opacity adjustment for calmer backgrounds.');overlay.addEventListener('input',()=>{state.overlay=Number(overlay.value);save();applyWallpaper()});
 const acts=document.createElement('div');acts.className='aio-appearance-row';acts.append(button('Apply wallpaper',()=>{const id=state.pendingWallpaper||state.wallpaper;if(id==='custom'&&!customUrl)return status('Upload an image first.');state.wallpaper=id;delete state.pendingWallpaper;save();applyWallpaper();refreshGallery();status('Wallpaper applied.');},true),button('Remove / reset wallpaper',()=>{state.wallpaper='default';delete state.pendingWallpaper;save();applyWallpaper();refreshGallery();status('Wallpaper reset to default.');}));wall.append(acts);root.append(wall);
 const nav=section('Navigation','Choose where the navigation sits. On small screens side navigation returns to the top.','aioNavigationSection');const navSelect=select([['top','Top'],['bottom','Bottom'],['left','Left'],['right','Right']],state.navPosition||'top','aioNavPosition');row(nav,'Navigation position',navSelect);navSelect.onchange=()=>{state.navPosition=navSelect.value;save();applyAll()};root.append(nav);
 const perf=section('Animation and performance','Reduce motion and avoid warming every remote game or image on low-powered devices.','aioPerfSection');
 const reduce=switcher(document.documentElement.classList.contains('reduced-motion'),'Reduce animations','aioAppearanceReducedMotion');row(perf,'Reduced motion',reduce,'Uses the existing reduced-motion setting.');reduce.querySelector('input').addEventListener('change',e=>{document.documentElement.classList.toggle('reduced-motion',e.target.checked);localStorage.setItem('aio-reduced-motion',e.target.checked?'1':'0');});
 const preload=switcher(localStorage.getItem('aio-preload-assets')!=='0','Preload all game artwork','aioAppearancePreload');row(perf,'Background artwork preloading',preload,'Turn off to reduce CPU, network and memory use.');preload.querySelector('input').addEventListener('change',e=>{localStorage.setItem('aio-preload-assets',e.target.checked?'1':'0');if(!e.target.checked)status('Background image preloading disabled. Reload to stop already-started work.');else if(typeof cacheGameImagesInBackground==='function'){imagePreloadStarted=false;cacheGameImagesInBackground();}});
 const perfNote=document.createElement('div');perfNote.className='aio-appearance-status';perfNote.textContent='Wallpaper thumbnails are CSS gradients and load no image files. Custom images load only after upload.';perf.append(perfNote);root.append(perf);
 const reset=section('Reset appearance','Reset only appearance preferences. Game progress, accounts, notes and other saved data are not changed.','aioResetAppearance');
 reset.append(button('Reset all appearance settings',async()=>{state={...defaults};await removeCustom();save();applyAll();buildRefresh();status('Appearance reset. Other saved data was left untouched.');},true));root.append(reset);
 const st=document.createElement('div');st.id='aioAppearanceStatus';st.className='aio-appearance-status';st.setAttribute('role','status');st.setAttribute('aria-live','polite');root.append(st);
 body.prepend(root);
 fs.addEventListener('change',()=>{state.font=fs.value;save();applyFont();status('Font preference saved.');});
 heading.querySelector('input').addEventListener('change',()=>{state.headingFont=heading.querySelector('input').checked?'cherry':'default';save();applyFont();status('Heading font preference saved.');});
 themeSel.addEventListener('change',()=>{state.theme=themeSel.value;save();applyTheme();status('Theme changed.');});
 $('aioCursorStyleSelect').addEventListener('change',e=>{state.cursorStyle=e.target.value;state.cursor=state.cursorStyle!=='default';save();applyCursor();status('Cursor preference saved.');});
}
function selectWallpaper(id){const w=wallpapers.find(x=>x.id===id);if(id==='custom'&&!customUrl){status('Upload an image first.');return;}if(id!=='custom'&&!w){status('That wallpaper is unavailable.');return;}const preview=$('aioWallpaperPreview');state.wallpaper=id;delete state.pendingWallpaper;save();applyWallpaper();if(preview){preview.style.backgroundImage=id==='custom'&&customUrl?'url("'+customUrl+'")':w?w.bg:'none';preview.textContent='Applied: '+(w?.name||'Custom image');}refreshGallery();status('Wallpaper applied and saved on this device.');}
function refreshGallery(){document.querySelectorAll('.aio-wallpaper-option').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wallpaper===(state.pendingWallpaper||state.wallpaper))));}
async function uploadWallpaper(e){const f=e.target.files?.[0];if(!f)return;if(!/^image\/(png|jpeg|webp|avif)$/.test(f.type)||f.size>8*1024*1024){status('Choose a PNG, JPEG, WebP or AVIF image under 8 MB.');e.target.value='';return;}try{const bitmap=await createImageBitmap(f);if(bitmap.width>12000||bitmap.height>12000){bitmap.close?.();throw Error('Image dimensions are too large.');}bitmap.close?.();await saveCustom(f);if(customUrl)URL.revokeObjectURL(customUrl);customUrl=URL.createObjectURL(f);state.pendingWallpaper='custom';selectWallpaper('custom');status('Image saved locally and ready to preview.');}catch(err){status('Could not save this image: '+(err?.message||'storage unavailable'));}finally{e.target.value='';}}
function applyAll(){document.documentElement.dataset.aioNavPosition=['top','bottom','left','right'].includes(state.navPosition)?state.navPosition:'top';applyFont();applyTheme();applyCursor();applyWallpaper();const s=$('aioFontSelect');if(s)s.value=state.font;}
function buildRefresh(){const r=$('aioAppearanceRoot');if(r)r.remove();build();getCustom();}
function applyPerformanceProfile(){
 const root=document.documentElement;
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 const memory=Number(navigator.deviceMemory)||0;
 const cores=Number(navigator.hardwareConcurrency)||0;
 const constrained=!!connection?.saveData||['slow-2g','2g'].includes(String(connection?.effectiveType||''))||(memory>0&&memory<=4)||(cores>0&&cores<=2);
 root.dataset.aioPerformanceProfile=constrained?'lite':'full';
}
function init(){
 applyPerformanceProfile();
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 connection?.addEventListener?.('change',applyPerformanceProfile);
 applyAll();build();getCustom();
}
document.addEventListener('DOMContentLoaded',init,{once:true});
document.addEventListener('click',e=>{const b=e.target.closest('#settingsBtn');if(b){setTimeout(()=>{build();updateFontPreview();},0)}});
window.addEventListener('storage',e=>{if(e.key===KEY){state=load();applyAll()}});
window.AIOAppearance={reset:()=>{state={...defaults};save();applyAll()},getState:()=>({...state}),getCursors:()=>cursorPacks.map(p=>({...p,preview:cursorImage(p.id,false),pointer:cursorImage(p.id,true)})),mountCursorGallery,getWallpapers:()=>wallpapers.map(w=>({id:w.id,name:w.name,bg:w.bg})).concat(customUrl?[{id:'custom',name:'Custom uploaded wallpaper',bg:'url(\"'+customUrl+'\")'}]:[]),setChoice:async choices=>{if(!choices||typeof choices!=='object')return; if(['system','inter','nunito','cherry','sakura'].includes(choices.font))state.font=choices.font; if(typeof choices.wallpaper==='string'&&(wallpapers.some(w=>w.id===choices.wallpaper)||choices.wallpaper==='custom'))state.wallpaper=choices.wallpaper; if(cursorPacks.some(p=>p.id===choices.cursorStyle)){state.cursorStyle=choices.cursorStyle;state.cursor=choices.cursorStyle!=='default';} if(['top','bottom','left','right'].includes(choices.navPosition))state.navPosition=choices.navPosition; if(['standard','glass'].includes(choices.theme))state.theme=choices.theme; if(['default','cherry'].includes(choices.headingFont))state.headingFont=choices.headingFont; if(choices.cursorSize!==undefined)state.cursorSize=Math.max(20,Math.min(48,Number(choices.cursorSize)||28)); if(/^#[0-9a-f]{6}$/i.test(choices.cursorColor||''))state.cursorColor=choices.cursorColor; save();applyAll();return {...state};}};
})();
