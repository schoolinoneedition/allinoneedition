(()=>{'use strict';
 const KEY='aio-site-version-v1';let bootVersion='',available='',timer=0;
 const read=()=>{try{return localStorage.getItem(KEY)||''}catch{return ''}};
 function offer(version){available=version;const body=document.querySelector('#settingsModal .settings-body');if(!body)return;let panel=document.getElementById('aioUpdatePanel');if(!panel){panel=document.createElement('section');panel.id='aioUpdatePanel';panel.className='aio-appearance-section';body.prepend(panel)}panel.replaceChildren();const title=document.createElement('h3');title.textContent='Update ready';const copy=document.createElement('p');copy.textContent='Version '+version+' is available. Finish your game or upload before reloading. Your saved preferences will be kept.';const button=document.createElement('button');button.type='button';button.className='btn mini primary';button.textContent='Reload when ready';button.onclick=()=>location.reload();panel.append(title,copy,button)}
 async function check(){
  if(document.hidden)return;
  try{const response=await fetch('/site-version.json',{cache:'no-store',credentials:'omit'});if(!response.ok)return;const data=await response.json();if(!/^[0-9.]{1,24}$/.test(data.version||''))return;
   if(!bootVersion){bootVersion=data.version;const old=read();try{localStorage.setItem(KEY,bootVersion)}catch{}if(old&&old!==bootVersion)window.AIONotifications?.notify?.('Site updated',String(data.summary||'The latest version is ready.').slice(0,180));return}
   if(data.version!==bootVersion&&data.version!==available){offer(data.version);window.AIONotifications?.notify?.('Update available','Finish what you are doing, then open Settings to reload. Your preferences are kept.')}
  }catch{/* A version check must never interrupt the site. */}
 }
 function schedule(){clearTimeout(timer);if(document.hidden)return;check();timer=setTimeout(schedule,300000)}
 document.addEventListener('visibilitychange',schedule);schedule();
})();
