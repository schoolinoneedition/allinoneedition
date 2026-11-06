/* All in One Edition polish: personalised greeting + lightweight cursor. */
(()=>{'use strict';
  const style=document.createElement('style');
  style.id='aio-polish-style';
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
  const greeting=()=>{
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
  };
  window.aioRefreshGreeting=greeting;
  const original=window.handleAuthSession;
  if(typeof original==='function'&&!original.__aioGreetingWrapped){
    const wrapped=async function(session){const result=await original.call(this,session);greeting();return result};
    wrapped.__aioGreetingWrapped=true;window.handleAuthSession=wrapped;
  }
  greeting();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)greeting()});
  window.addEventListener('pageshow',greeting);
})();