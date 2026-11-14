/* Non-intrusive on-site greetings and weekday hometime alerts. */
(() => {
 'use strict';
 function notify(title,message){
  let root=document.getElementById('aioNotices');
  if(!root){root=document.createElement('div');root.id='aioNotices';root.setAttribute('aria-live','polite');document.body.append(root)}
  const notice=document.createElement('div');notice.className='aio-notice';
  const strong=document.createElement('strong');strong.textContent=title;
  const text=document.createElement('span');text.textContent=message;
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Dismiss notification');
  close.onclick=()=>notice.remove();notice.append(strong,text,close);root.appendChild(notice);setTimeout(()=>notice.remove(),8500);
 }
 function once(key){try{if(localStorage.getItem(key))return false;localStorage.setItem(key,'1');return true}catch{return true}}
 function timeCheck(){
  const now=new Date(),day=now.getDay();if(day===0||day===6||document.hidden)return;
  const minutes=now.getHours()*60+now.getMinutes(),date=[now.getFullYear(),now.getMonth()+1,now.getDate()].join('-');
  if(minutes>=900&&minutes<930&&once('aio-hometime-soon-'+date))notify('Nearly hometime','30 minutes or less until 15:30.');
  if(minutes>=930&&minutes<960&&once('aio-hometime-now-'+date))notify('Hometime','It is 15:30 — have a good one!');
 }
 function start(){
  setTimeout(()=>{let username='Guest';try{username=String(currentProfile?.username||currentUser?.user_metadata?.username||'Guest').slice(0,24)}catch{}const hour=new Date().getHours();notify(hour<12?'Good morning':hour<17?'Good afternoon':'Good evening','Welcome, '+username+'!');timeCheck()},7800);
  setInterval(timeCheck,30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)timeCheck()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
