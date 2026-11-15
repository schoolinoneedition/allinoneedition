/* Sync only cosmetic preferences through the current user's authenticated metadata. */
(()=>{'use strict';
 const APPEARANCE='aio-appearance-v1',SETUP='aio-ultimate-onboarding-v1',NOTICES='aio-notification-settings-v1';
 let owner=null,timer=0,applying=false,lastSaved='';
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
 const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
 const client=()=>{try{return typeof supabaseClient!=='undefined'?supabaseClient:null}catch{return null}};
 function snapshot(){const a=window.AIOAppearance?.getState?.()||{};return {version:1,appearance:{font:a.font,headingFont:a.headingFont,theme:a.theme,wallpaper:a.wallpaper==='custom'?'default':a.wallpaper,cursorStyle:a.cursorStyle==='upload'?'default':a.cursorStyle,cursorSize:a.cursorSize,cursorColor:a.cursorColor,navPosition:a.navPosition},notifications:window.AIONotifications?.getSettings?.()||{},setupComplete:!!(read(SETUP)?.completed||read(SETUP)?.dismissed)}}
 async function restore(user){
  if(!user){owner=null;clearTimeout(timer);return}
  if(owner===user.id)return;
  owner=user.id;clearTimeout(timer);const id=owner;
  const remote=user.user_metadata?.aio_preferences;
  if(remote?.version===1&&remote.appearance&&typeof remote.appearance==='object'){
   applying=true;
   try{await window.AIOAppearance?.setChoice?.(remote.appearance);window.AIONotifications?.setSettings?.(remote.notifications||{});
    if(remote.setupComplete===true){write(SETUP,{completed:true,at:Date.now(),restored:true});document.getElementById('aioOnboarding')?.classList.remove('open');document.body.classList.remove('aio-onboarding-open')}
   }finally{applying=false}
  }
  if(owner!==id)return;lastSaved=remote?JSON.stringify(snapshot()):'';schedule();
 }
 function schedule(){if(applying||!owner)return;clearTimeout(timer);timer=setTimeout(save,1200)}
 async function save(){
  const db=client(),id=owner;if(!db||!id)return;
  const data=snapshot(),encoded=JSON.stringify(data);if(encoded===lastSaved)return;
  try{
   const session=await db.auth.getSession();if(owner!==id||session.data?.session?.user?.id!==id)return;
   const result=await db.auth.updateUser({data:{aio_preferences:data}});
   if(result.error)throw result.error;
   if(owner===id)lastSaved=encoded;
  }catch{window.AIONotifications?.notify?.('Saved on this device','Account preference sync is unavailable. Your local settings are kept.');}
 }
 window.addEventListener('aio-preferences-changed',schedule);
 window.addEventListener('aio-auth-ready',event=>restore(event.detail?.user));
 try{if(typeof currentUser!=='undefined'&&currentUser)restore(currentUser)}catch{}
 window.AIOPreferenceSync={restore,snapshot};
})();
