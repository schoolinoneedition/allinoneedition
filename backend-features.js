/* All in One Edition: authenticated staff controls and persistent video discovery. */
(function(){
  'use strict';
  let staffRole = null;
  let videoOffset = 0;
  let videoHasMore = true;
  let videoBusy = false;

  function byId(id){ return document.getElementById(id); }
  function toast(message){ if(typeof showToast === 'function') showToast(message); else console.info(message); }

  window.resetAccountPassword = async function(){
    if(typeof supabaseClient === 'undefined' || !supabaseClient){ toast('Supabase is not ready. Refresh and try again.'); return; }
    const email=String(byId('authEmail')?.value||'').trim();
    if(!email){ const status=byId('authStatus'); if(status)status.textContent='Enter your account email first, then press Forgot password again.'; return; }
    const button=document.querySelector('#authModal button[onclick="resetAccountPassword()"]');
    if(button){button.disabled=true;button.textContent='Sending…';}
    try{
      const {error}=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/'});
      if(error)throw error;
      if(byId('authStatus'))byId('authStatus').textContent='If an account exists for that email, a password reset email has been sent. Check your inbox and spam folder.';
    }catch(error){
      if(byId('authStatus'))byId('authStatus').textContent=error?.message||'Could not request a password reset. Try again later.';
    }finally{
      if(button){button.disabled=false;button.textContent='Forgot password?';}
    }
  };

  window.refreshAioStaffPanel = async function(){
    const panel=byId('aioStaffPanel');
    if(!panel)return;
    if(typeof supabaseClient==='undefined'||!supabaseClient||typeof currentUser==='undefined'||!currentUser){panel.classList.add('hidden');return;}
    panel.classList.remove('hidden');
    const status=byId('aioStaffStatus'),setup=byId('aioStaffOwnerSetup'),controls=byId('aioStaffControls');
    const {data,error}=await supabaseClient.from('staff_roles').select('role').eq('user_id',currentUser.id).maybeSingle();
    if(error){
      if(status)status.textContent='Could not check staff permissions. Check the XBT staff_roles policy.';
      setup?.classList.add('hidden');controls?.classList.add('hidden');return;
    }
    staffRole=data?.role||null;
    if(staffRole==='owner'){
      if(status)status.textContent='Site owner · you can assign and revoke staff roles.';
      setup?.classList.add('hidden');controls?.classList.remove('hidden');
      await window.loadAioStaffList();
      return;
    }
    controls?.classList.add('hidden');
    const ownerResult=await supabaseClient.rpc('aio_owner_exists');
    if(!ownerResult.error&&ownerResult.data===false){
      if(status)status.textContent='Owner setup required.';
      setup?.classList.remove('hidden');
      if(byId('aioStaffCurrentId'))byId('aioStaffCurrentId').value=currentUser.id;
    }else{
      setup?.classList.add('hidden');
      if(status)status.textContent=staffRole?('Your role: '+staffRole+'. Staff assignment is owner-only.'):'Staff management is restricted to the site owner.';
    }
  };

  window.copyAioOwnerSetup = async function(){
    if(typeof currentUser==='undefined'||!currentUser)return;
    const sql="insert into public.staff_roles (user_id, role) values ('"+currentUser.id+"'::uuid, 'owner') on conflict (user_id) do update set role = 'owner';";
    try{await navigator.clipboard.writeText(sql);toast('Owner setup SQL copied. Run it in the XBT Supabase SQL Editor as a project administrator.');}
    catch{toast('Clipboard unavailable. Your account ID is shown above.');}
  };

  window.loadAioStaffList = async function(){
    const box=byId('aioStaffList');
    if(!box||staffRole!=='owner'||typeof supabaseClient==='undefined'||!supabaseClient)return;
    box.textContent='Loading staff…';
    const result=await supabaseClient.from('staff_roles').select('user_id,role,created_at').order('created_at',{ascending:false});
    if(result.error){box.textContent='Could not load staff: '+result.error.message;return;}
    const rows=result.data||[];
    let profiles=[];
    if(rows.length){
      const p=await supabaseClient.from('profiles').select('id,username').in('id',rows.map(r=>r.user_id));
      if(!p.error)profiles=p.data||[];
    }
    const names=new Map(profiles.map(p=>[p.id,p.username]));
    box.replaceChildren();
    if(!rows.length){box.textContent='No staff roles assigned yet.';return;}
    rows.forEach(roleRow=>{
      const row=document.createElement('div');row.className='aio-staff-row';
      const info=document.createElement('div');info.className='aio-staff-info';
      const name=document.createElement('strong');name.textContent=names.get(roleRow.user_id)||'Account '+roleRow.user_id.slice(0,8);
      const details=document.createElement('span');details.textContent=roleRow.role+' · '+roleRow.user_id;
      info.append(name,details);row.append(info);
      const badge=document.createElement('span');badge.className='aio-staff-role';badge.textContent=roleRow.role;row.append(badge);
      if(roleRow.role!=='owner'){
        const revoke=document.createElement('button');revoke.type='button';revoke.className='btn mini';revoke.textContent='Revoke';
        revoke.addEventListener('click',()=>window.revokeAioStaff(roleRow.user_id));row.append(revoke);
      }
      box.append(row);
    });
  };

  window.assignAioStaff = async function(){
    if(staffRole!=='owner'||!supabaseClient){toast('Only the site owner can assign staff.');return;}
    const input=byId('aioStaffUsername'),roleSelect=byId('aioStaffRole'),username=String(input?.value||'').trim();
    if(!username){toast('Enter the exact username of an existing account.');return;}
    const target=await supabaseClient.from('profiles').select('id,username').eq('username',username).maybeSingle();
    if(target.error){toast('Account lookup failed: '+target.error.message);return;}
    if(!target.data){toast('No profile found. Ask that person to sign up and sign in once first.');return;}
    const result=await supabaseClient.rpc('manage_aio_staff_role',{p_target_user_id:target.data.id,p_role:roleSelect?.value||'staff',p_revoke:false});
    if(result.error){toast('Could not assign role: '+result.error.message);return;}
    if(input)input.value='';
    toast('Role assigned to '+target.data.username+'.');
    await window.loadAioStaffList();
  };

  window.revokeAioStaff = async function(userId){
    if(staffRole!=='owner'||!supabaseClient){toast('Only the site owner can revoke staff.');return;}
    if(!confirm('Revoke this account’s staff role?'))return;
    const result=await supabaseClient.rpc('manage_aio_staff_role',{p_target_user_id:userId,p_role:'staff',p_revoke:true});
    if(result.error){toast('Could not revoke role: '+result.error.message);return;}
    toast('Staff role revoked.');
    await window.loadAioStaffList();
  };

  window.loadVideoGallery = async function(reset=true){
    const box=byId('videoGallery'),status=byId('videoGalleryStatus'),more=byId('videoLoadMore');
    if(!box||videoBusy)return;
    if(typeof supabaseClient==='undefined'||!supabaseClient){if(status)status.textContent='Cloud service is not ready. Refresh to retry; no demo videos are shown.';return;}
    videoBusy=true;
    if(reset){videoOffset=0;videoHasMore=true;box.replaceChildren();box.dataset.loaded='1';if(status)status.textContent='Loading saved videos…';}
    else if(status)status.textContent='Loading more videos…';
    try{
      const query=await supabaseClient.from('social_posts').select('id,visitor_id,username,caption,media_url,created_at').eq('media_type','video').order('created_at',{ascending:false}).range(videoOffset,videoOffset+23);
      if(query.error)throw query.error;
      const rows=query.data||[];videoOffset+=rows.length;videoHasMore=rows.length===24;
      rows.forEach(post=>{
        const card=document.createElement('article');card.className='aio-video-card';
        card.dataset.search=((post.caption||'')+' '+(post.username||'')).toLowerCase();
        const player=document.createElement('video');player.controls=true;player.preload='metadata';player.playsInline=true;player.src=post.media_url;player.setAttribute('aria-label','Video by '+(post.username||'community member'));
        player.addEventListener('error',()=>{if(!card.querySelector('.aio-video-error')){const err=document.createElement('div');err.className='aio-video-error';err.textContent='This video is unavailable. Refresh the gallery to retry.';card.append(err);}}, {once:true});
        const details=document.createElement('div');details.className='aio-video-details';
        const title=document.createElement('strong');title.textContent=post.caption||'Community video';
        const meta=document.createElement('span');const date=new Date(post.created_at);meta.textContent=(post.username||'Community member')+' · '+(Number.isNaN(date.getTime())?'Recently uploaded':date.toLocaleDateString());
        details.append(title,meta);card.append(player,details);box.append(card);
      });
      if(reset&&!rows.length){const empty=document.createElement('div');empty.className='aio-video-empty';empty.textContent='No videos have been uploaded yet. Sign in and post an MP4 in Community to get started.';box.append(empty);}
      if(status)status.textContent=videoOffset?'Showing '+videoOffset+' saved video'+(videoOffset===1?'':'s'):'No videos found.';
      if(more)more.classList.toggle('hidden',!videoHasMore);
      window.filterVideoGallery();
    }catch(error){
      if(status)status.textContent='Could not load videos: '+(error?.message||'network error')+'. Use Refresh to retry.';
    }finally{videoBusy=false;}
  };

  window.filterVideoGallery = function(){
    const query=String(byId('videoSearchInput')?.value||'').trim().toLowerCase();
    document.querySelectorAll('#videoGallery .aio-video-card').forEach(card=>card.classList.toggle('hidden',!!query&&!card.dataset.search.includes(query)));
  };

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-scroll="videos"]'))setTimeout(()=>window.loadVideoGallery(true),80);
  });
  window.addEventListener('load',()=>setTimeout(()=>window.refreshAioStaffPanel(),150));
})();
