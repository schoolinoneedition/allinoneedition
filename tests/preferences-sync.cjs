const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const events={},store=new Map();let timer,sessionUser='a',writes=[],appearance={font:'inter',cursorStyle:'ocean',wallpaper:'custom'},notices={theme:'ocean'},closed=0;
const ctx={console,Date,JSON,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},setTimeout:fn=>{timer=fn;return 1},clearTimeout:()=>{timer=null},document:{getElementById:()=>({classList:{remove:()=>closed++}}),body:{classList:{remove:()=>{}}}},supabaseClient:{auth:{getSession:async()=>({data:{session:{user:{id:sessionUser}}}}),updateUser:async data=>{writes.push(data);return {}}}},window:{addEventListener:(k,fn)=>events[k]=fn,AIOAppearance:{getState:()=>appearance,setChoice:async a=>{appearance=a}},AIONotifications:{getSettings:()=>notices,setSettings:n=>{notices=n},notify:()=>{}}}};
vm.runInNewContext(fs.readFileSync('preferences-sync.js','utf8'),ctx);
(async()=>{
 const api=ctx.window.AIOPreferenceSync;
 await api.restore({id:'a',user_metadata:{}});await timer();assert.equal(writes.length,1);assert.equal(writes[0].data.aio_preferences.appearance.wallpaper,'default','Device uploads never go to account metadata');
 await api.restore(null);assert.equal(timer,null,'Sign out cancels pending saves');
 await api.restore({id:'b',user_metadata:{aio_preferences:{version:1,appearance:{font:'system',cursorStyle:'minimal'},notifications:{theme:'classic'},setupComplete:true}}});
 assert.equal(appearance.font,'system');assert.equal(notices.theme,'classic');assert.equal(JSON.parse(store.get('aio-ultimate-onboarding-v1')).completed,true);assert.equal(closed,1);
 appearance.font='inter';events['aio-preferences-changed']();await timer();assert.equal(writes.length,1,'Never write preferences under a different auth session');
 sessionUser='b';events['aio-preferences-changed']();await timer();assert.equal(writes.length,2);
 console.log('Account preferences: authenticated metadata, restoration, completion, sign-out cancellation and session boundary passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
