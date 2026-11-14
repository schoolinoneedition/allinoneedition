/* Original AIO bonus games. No external assets, third-party accounts or remote game promises. */
(()=>{
 'use strict';
 const MODES=Object.freeze({
  snake:{title:'Circuit Snake',sub:'Classic arcade, new neon tracks',hint:'Collect golden data nodes. Arrows, WASD or swipe to turn; do not hit your own trail.'},
  merge:{title:'Merge Matrix',sub:'Slide tiles, build bigger numbers',hint:'Slide with arrow keys, WASD or swipe. Merge equal numbers to earn points.'},
  orbit:{title:'Orbit Dash',sub:'Dodge an endless meteor shower',hint:'Use left/right arrows, A/D or drag to dodge. Every second survived earns points.'},
  catch:{title:'Colour Catch',sub:'Collect blue energy, avoid red',hint:'Move with left/right arrows, A/D or drag. Catch cyan energy, avoid red and do not miss blue.'}
 });
 const requested=new URLSearchParams(location.search).get('game');
 const mode=Object.hasOwn(MODES,requested)?requested:'snake';
 const cfg=MODES[mode],W=420,H=600;
 const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d');
 if(!ctx)return;
 $('title').textContent=cfg.title;
 $('subtitle').textContent=cfg.sub;
 $('hint').textContent=cfg.hint;
 canvas.setAttribute('aria-label',cfg.title+' interactive game board');
 const overlay=$('overlay'),overlayTitle=$('overlayTitle'),overlayText=$('overlayText'),play=$('play');
 const bestKey='aio-bonus-best-'+mode;
 let high=0;
 try{high=Math.max(0,Number(localStorage.getItem(bestKey))||0)}catch{}
 $('best').textContent=String(high);
 let state='ready',game={},lastFrame=0,raf=0,held=new Set(),touch=null;
 let score=0;
 const randint=n=>Math.floor(Math.random()*n),clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 const corners=(x,y,w,h,r=10)=>{
  r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
 };
 const fillRound=(x,y,w,h,color,r=10)=>{ctx.fillStyle=color;corners(x,y,w,h,r);ctx.fill()};
 function updateScore(value){
  score=Math.max(0,Math.floor(value));$('score').textContent=String(score);
  if(score>high){
   high=score;$('best').textContent=String(high);
   try{localStorage.setItem(bestKey,String(high))}catch{}
  }
 }
 function announce(text){$('announcer').textContent=text}
 function showOverlay(title,text,label){
  overlayTitle.textContent=title;overlayText.textContent=text;play.textContent=label;overlay.hidden=false;
 }
 function cancel(){if(raf)cancelAnimationFrame(raf);raf=0}
 function finish(text){
  state='ended';cancel();
  showOverlay('Round over',text+' · Score '+score+'.','Play again');
  announce(text+'. Final score '+score);
 }
 function spawnFood(){
  const occupied=new Set(game.snake.map(part=>part.x+','+part.y));
  const free=[];
  for(let x=0;x<21;x++)for(let y=0;y<30;y++)if(!occupied.has(x+','+y))free.push({x,y});
  if(!free.length){finish('You filled the entire board');return}
  game.food=free[randint(free.length)];
 }
 function resetSnake(){
  game={snake:[{x:10,y:15},{x:9,y:15},{x:8,y:15}],dir:{x:1,y:0},next:{x:1,y:0},turnLocked:false,food:null,acc:0};
  spawnFood();
 }
 function spawnTile(){
  const free=[];
  for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(game.grid[y][x]===0)free.push({x,y});
  if(!free.length)return false;
  const target=free[randint(free.length)];game.grid[target.y][target.x]=Math.random()<.91?2:4;return true;
 }
 function resetMerge(){
  game={grid:Array.from({length:4},()=>[0,0,0,0])};
  spawnTile();spawnTile();
 }
 function resetOrbit(){game={shipX:W/2,rocks:[],clock:0,spawn:0,stars:Array.from({length:45},()=>({x:randint(W),y:randint(H),r:Math.random()*1.7+.5}))};}
 function resetCatch(){game={basketX:W/2,drops:[],clock:0,spawn:0,lives:3,stars:Array.from({length:25},()=>({x:randint(W),y:randint(H)}))};}
 function reset(){
  cancel();held.clear();touch=null;lastFrame=0;state='playing';updateScore(0);
  if(mode==='snake')resetSnake();if(mode==='merge')resetMerge();
  if(mode==='orbit')resetOrbit();if(mode==='catch')resetCatch();
  overlay.hidden=true;announce('Playing '+cfg.title);draw();
  if(mode!=='merge')raf=requestAnimationFrame(loop);
 }
 function pause(){
  if(state==='playing'){
   state='paused';cancel();held.clear();
   showOverlay('Paused','Your game is paused. Press Resume to continue.','Resume');
   announce('Game paused');
  }else if(state==='paused')resume();
 }
 function resume(){
  if(state!=='paused')return;
  state='playing';lastFrame=0;overlay.hidden=true;announce('Resumed');
  if(mode!=='merge')raf=requestAnimationFrame(loop);
 }
 function snakeStep(){
  game.dir={...game.next};game.turnLocked=false;
  const head={x:game.snake[0].x+game.dir.x,y:game.snake[0].y+game.dir.y};
  if(head.x<0||head.x>=21||head.y<0||head.y>=30){finish('You hit the edge');return}
  const ate=head.x===game.food.x&&head.y===game.food.y;
  const body=ate?game.snake:game.snake.slice(0,-1);
  if(body.some(part=>part.x===head.x&&part.y===head.y)){finish('You hit your trail');return}
  game.snake.unshift(head);
  if(ate){updateScore(score+10);spawnFood();announce('Score '+score)}
  else game.snake.pop();
 }
 function compress(line){
  const values=line.filter(Boolean),out=[];
  for(let i=0;i<values.length;i++){
   if(values[i]===values[i+1]){const v=values[i]*2;out.push(v);updateScore(score+v);i++}
   else out.push(values[i]);
  }
  while(out.length<4)out.push(0);
  return out;
 }
 function canMove(){
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){
   if(!game.grid[y][x])return true;
   if(x<3&&game.grid[y][x]===game.grid[y][x+1])return true;
   if(y<3&&game.grid[y][x]===game.grid[y+1][x])return true;
  }
  return false;
 }
 function mergeMove(dir){
  const before=JSON.stringify(game.grid);
  for(let i=0;i<4;i++){
   if(dir==='left'||dir==='right'){
    const line=[...game.grid[i]];
    if(dir==='right')line.reverse();
    const next=compress(line);
    game.grid[i]=dir==='right'?next.reverse():next;
   }else{
    const line=game.grid.map(row=>row[i]);
    if(dir==='down')line.reverse();
    const next=compress(line);
    const result=dir==='down'?next.reverse():next;
    for(let y=0;y<4;y++)game.grid[y][i]=result[y];
   }
  }
  if(before!==JSON.stringify(game.grid)){spawnTile();announce('Score '+score)}
  if(!canMove())finish('No moves left');
  draw();
 }
 function steer(dir){
  if(state!=='playing')return;
  const vector={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}}[dir];
  if(!vector)return;
  if(mode==='snake'){
   if(game.turnLocked)return;
   if(vector.x===-game.dir.x&&vector.y===-game.dir.y)return;
   game.next=vector;game.turnLocked=true;
  }else if(mode==='merge')mergeMove(dir);
  else if(vector.x!==0){
   const key=vector.x<0?'left':'right';
   held.add(key);
   game[mode==='orbit'?'shipX':'basketX']=clamp(game[mode==='orbit'?'shipX':'basketX']+vector.x*34,30,W-30);
   draw();
  }
 }
 function updateOrbit(dt){
  game.clock+=dt;game.spawn+=dt;
  const xMove=(held.has('left')?-1:0)+(held.has('right')?1:0);
  game.shipX=clamp(game.shipX+xMove*340*dt,24,W-24);
  const interval=Math.max(.25,.74-game.clock*.0045);
  if(game.spawn>=interval){
   game.spawn=0;
   game.rocks.push({x:25+Math.random()*(W-50),y:-26,r:12+randint(12),speed:140+game.clock*3+randint(80)});
  }
  for(const rock of game.rocks){
   rock.y+=rock.speed*dt;
   if(Math.hypot(rock.x-game.shipX,rock.y-535)<rock.r+17){finish('A meteor caught you');return}
  }
  game.rocks=game.rocks.filter(rock=>rock.y<H+45);
  updateScore(game.clock*5);
 }
 function updateCatch(dt){
  game.clock+=dt;game.spawn+=dt;
  const moving=(held.has('left')?-1:0)+(held.has('right')?1:0);
  game.basketX=clamp(game.basketX+moving*370*dt,35,W-35);
  if(game.spawn>=.65){game.spawn=0;game.drops.push({x:25+Math.random()*(W-50),y:-30,kind:Math.random()<.72?'good':'bad',speed:160+game.clock*2+randint(50)})}
  for(const drop of game.drops){
   drop.y+=drop.speed*dt;
   if(drop.y>=530&&drop.y<=550&&Math.abs(drop.x-game.basketX)<43){
    drop.done=true;
    if(drop.kind==='good'){updateScore(score+10);announce('Collected energy, score '+score)}
    else{game.lives--;announce('Avoid red energy. Lives '+game.lives)}
   }else if(drop.y>H+24){
    drop.done=true;
    if(drop.kind==='good'){game.lives--;announce('Missed blue energy. Lives '+game.lives)}
   }
  }
  game.drops=game.drops.filter(drop=>!drop.done);
  if(game.lives<=0)finish('Your collector ran out of energy');
 }
 function loop(time){
  if(state!=='playing')return;
  const dt=lastFrame?Math.min(.04,(time-lastFrame)/1000):0;
  lastFrame=time;
  if(mode==='snake'){
   game.acc+=dt;
   const every=Math.max(.075,.16-score/1500);
   if(game.acc>=every){game.acc=0;snakeStep()}
  }
  if(mode==='orbit')updateOrbit(dt);
  if(mode==='catch')updateCatch(dt);
  draw();
  if(state==='playing')raf=requestAnimationFrame(loop);
 }
 function background(){
  ctx.fillStyle='#0d192e';ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='#1c2f4c';ctx.lineWidth=1;
  for(let x=0;x<W;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
  for(let y=0;y<H;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 }
 function drawSnake(){
  ctx.strokeStyle='#18304b';ctx.lineWidth=1;
  for(let x=0;x<21;x++)for(let y=0;y<30;y++){ctx.strokeRect(x*20+.5,y*20+.5,19,19)}
  if(game.food){
   const x=game.food.x*20+10,y=game.food.y*20+10;
   ctx.fillStyle='#f9ca68';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fff4cf';ctx.beginPath();ctx.arc(x-2,y-2,2.5,0,Math.PI*2);ctx.fill();
  }
  game.snake.forEach((part,i)=>{
   fillRound(part.x*20+2,part.y*20+2,16,16,i?'#46c3b6':'#b0fff0',5);
   if(i===0){ctx.fillStyle='#173d4a';ctx.fillRect(part.x*20+8,part.y*20+7,4,4)}
  });
 }
 function drawMerge(){
  ctx.fillStyle='#edf5ff';ctx.font='800 21px system-ui';ctx.fillText('Merge equal tiles · reach 2048',29,81);
  fillRound(23,122,374,374,'#253958',20);
  const shades=['','#e7eef7','#c4dfef','#a6d7e4','#90cbb8','#f8d184','#f5b77d','#f39170','#c19bef','#aa87ed','#8b75d3','#6f8adf'];
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){
   const n=game.grid[y][x],px=32+x*92,py=131+y*92;
   const idx=n?Math.min(shades.length-1,Math.log2(n)):0;
   fillRound(px,py,82,82,n?shades[idx]:'#395171',12);
   if(n){ctx.fillStyle=n>=64?'#fff':'#1a2c49';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=(n<1000?'900 27px':'800 21px')+' system-ui';ctx.fillText(String(n),px+41,py+42);ctx.textAlign='left';ctx.textBaseline='alphabetic'}
  }
  ctx.font='600 14px system-ui';ctx.fillStyle='#aebed6';ctx.fillText('Use arrows or swipe. Every move spawns a tile.',25,545);
 }
 function drawStars(stars){
  ctx.fillStyle='#7c9bc9';
  for(const s of stars){ctx.globalAlpha=.4;ctx.beginPath();ctx.arc(s.x,s.y,s.r||1,0,Math.PI*2);ctx.fill()}
  ctx.globalAlpha=1;
 }
 function drawOrbit(){
  drawStars(game.stars);
  for(const rock of game.rocks){
   ctx.fillStyle='#cf8fa0';ctx.beginPath();ctx.arc(rock.x,rock.y,rock.r,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#ebc7c8';ctx.beginPath();ctx.arc(rock.x-4,rock.y-4,Math.max(3,rock.r*.28),0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle='#6b9cf3';ctx.beginPath();ctx.moveTo(game.shipX,511);ctx.lineTo(game.shipX-21,551);ctx.lineTo(game.shipX,544);ctx.lineTo(game.shipX+21,551);ctx.closePath();ctx.fill();
  ctx.fillStyle='#c8e7ff';ctx.beginPath();ctx.moveTo(game.shipX,518);ctx.lineTo(game.shipX-6,535);ctx.lineTo(game.shipX+6,535);ctx.closePath();ctx.fill();
  ctx.font='700 13px system-ui';ctx.fillStyle='#c3d7ff';ctx.fillText('SURVIVE · '+Math.floor(game.clock)+'s',18,32);
 }
 function drawCatch(){
  drawStars(game.stars);
  for(const drop of game.drops){
   ctx.fillStyle=drop.kind==='good'?'#64d7ea':'#f1788d';
   ctx.beginPath();ctx.arc(drop.x,drop.y,14,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fff';ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(drop.x-4,drop.y-5,4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
  fillRound(game.basketX-41,543,82,22,'#8caefd',9);
  fillRound(game.basketX-34,544,68,9,'#d4e1ff',5);
  ctx.font='800 15px system-ui';ctx.fillStyle='#dae8ff';ctx.fillText('LIVES: '+game.lives,18,32);
  ctx.font='700 12px system-ui';ctx.fillStyle='#9eb6d5';ctx.fillText('BLUE +10  ·  RED -1 LIFE',18,53);
 }
 function draw(){
  background();
  if(mode==='snake')drawSnake();
  if(mode==='merge')drawMerge();
  if(mode==='orbit')drawOrbit();
  if(mode==='catch')drawCatch();
 }
 document.addEventListener('keydown',event=>{
  const direction={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'}[event.key];
  if(direction){event.preventDefault();if(event.repeat&&mode==='merge')return;steer(direction)}
  if(event.key===' '||event.key.toLowerCase()==='p'){event.preventDefault();if(state==='ready'||state==='ended')reset();else pause()}
 });
 document.addEventListener('keyup',event=>{
  const dir={ArrowLeft:'left',ArrowRight:'right',a:'left',d:'right'}[event.key];
  if(dir)held.delete(dir);
 });
 for(const button of document.querySelectorAll('[data-dir]')){
  const dir=button.dataset.dir;
  button.addEventListener('pointerdown',event=>{event.preventDefault();steer(dir)});
  button.addEventListener('pointerup',()=>held.delete(dir));
  button.addEventListener('pointercancel',()=>held.delete(dir));
  button.addEventListener('pointerleave',()=>held.delete(dir));
 }
 canvas.addEventListener('pointerdown',event=>{
  touch={x:event.clientX,y:event.clientY};
  if((mode==='orbit'||mode==='catch')&&state==='playing'){
   const rect=canvas.getBoundingClientRect();
   game[mode==='orbit'?'shipX':'basketX']=clamp((event.clientX-rect.left)*W/rect.width,35,W-35);
  }
 });
 canvas.addEventListener('pointermove',event=>{
  if(!touch||state!=='playing'||(mode!=='orbit'&&mode!=='catch'))return;
  const rect=canvas.getBoundingClientRect();
  game[mode==='orbit'?'shipX':'basketX']=clamp((event.clientX-rect.left)*W/rect.width,35,W-35);
 });
 canvas.addEventListener('pointerup',event=>{
  if(!touch)return;
  const dx=event.clientX-touch.x,dy=event.clientY-touch.y;touch=null;
  if((mode==='snake'||mode==='merge')&&Math.hypot(dx,dy)>22)steer(Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down');
 });
 canvas.addEventListener('pointercancel',()=>{touch=null});
 play.addEventListener('click',()=>state==='paused'?resume():reset());
 $('restart').addEventListener('click',reset);
 $('pause').addEventListener('click',()=>state==='ready'||state==='ended'?reset():pause());
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
 window.addEventListener('pagehide',()=>{cancel();held.clear()});
 updateScore(0);
 showOverlay('Ready for '+cfg.title+'?',cfg.hint,'Play '+cfg.title);
 if(mode==='snake')resetSnake();
 if(mode==='merge')resetMerge();
 if(mode==='orbit')resetOrbit();
 if(mode==='catch')resetCatch();
 draw();
 window.aioBonusArcade={mode,available:()=>Object.keys(MODES),status:()=>state,score:()=>score};
})();
