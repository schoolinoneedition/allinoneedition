/* Three ORIGINAL 3×3 grid games; intentionally unrelated to the existing 3×3 catalogue titles. */
(()=>{
 'use strict';
 const MODES=Object.freeze({
  slide:{title:'3×3 Tile Slide',description:'Move tiles into order 1–8, leaving the final space empty. Tap a tile next to the gap or use arrow keys.',label:'Moves'},
  xo:{title:'3×3 Tic Tac Toe',description:'Be X and play against the computer. Make three in a row before the O player does.',label:'Rounds'},
  memory:{title:'3×3 Pattern Recall',description:'Watch the highlighted tiles, then repeat the sequence. Each round adds one more step.',label:'Level'}
 });
 const requested=new URLSearchParams(location.search).get('game');
 const mode=Object.hasOwn(MODES,requested)?requested:'slide';
 const cfg=MODES[mode],grid=document.getElementById('grid'),status=document.getElementById('status'),score=document.getElementById('score');
 document.getElementById('title').textContent=cfg.title;
 document.getElementById('instructions').textContent=cfg.description;
 document.getElementById('scoreLabel').textContent=cfg.label;
 let values=[],moves=0,ended=false,pending=false,memorySeq=[],memoryInput=0,level=0;
 const timers=new Set();
 const paths=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
 const adjacent=(a,b)=>Math.abs(Math.floor(a/3)-Math.floor(b/3))+Math.abs(a%3-b%3)===1;
 const solved=board=>board.every((v,i)=>v===(i+1)%9);
 function schedule(fn,delay){const id=setTimeout(()=>{timers.delete(id);fn()},delay);timers.add(id);return id}
 function clearTimers(){for(const timer of timers)clearTimeout(timer);timers.clear()}
 function show(text){status.textContent=text}
 function setScore(n){score.textContent=String(n)}
 function winner(board){
  for(const line of paths){
   const [a,b,c]=line;
   if(board[a]&&board[a]===board[b]&&board[a]===board[c])return board[a];
  }
  return board.every(Boolean)?'draw':null;
 }
 function minimax(board,turn,depth){
  const outcome=winner(board);
  if(outcome)return outcome==='O'?10-depth:outcome==='X'?depth-10:0;
  let best=turn==='O'?-Infinity:Infinity;
  for(let i=0;i<9;i++){
   if(board[i])continue;
   board[i]=turn;
   const result=minimax(board,turn==='O'?'X':'O',depth+1);
   board[i]='';
   best=turn==='O'?Math.max(best,result):Math.min(best,result);
  }
  return best;
 }
 function bestMove(board){
  let best=-Infinity,choice=-1;
  for(let i=0;i<9;i++){
   if(board[i])continue;
   board[i]='O';
   const result=minimax(board,'X',0);
   board[i]='';
   if(result>best){best=result;choice=i}
  }
  return choice;
 }
 function render(lit=-1){
  grid.replaceChildren();
  values.forEach((value,i)=>{
   const cell=document.createElement('button');
   cell.type='button';cell.className='cell';
   cell.dataset.index=String(i);
   cell.setAttribute('aria-label','Tile '+(i+1)+': '+(mode==='slide'?(value||'empty'):mode==='xo'?(value||'empty'):'pattern tile'));
   if(mode==='slide'){
    cell.textContent=value===0?'':String(value);
    if(value===0){cell.classList.add('empty');cell.disabled=true}
    else cell.disabled=ended;
   }else if(mode==='xo'){
    cell.textContent=value||'';
    cell.dataset.mark=value||'';
    cell.disabled=ended||pending||Boolean(value);
   }else{
    cell.textContent=String(i+1);
    cell.dataset.lit=String(lit===i);
    cell.disabled=ended||pending;
   }
   cell.addEventListener('click',()=>choose(i));
   grid.appendChild(cell);
  });
 }
 function newSlide(){
  values=[1,2,3,4,5,6,7,8,0];
  let gap=8,last=-1;
  for(let n=0;n<110;n++){
   const next=[...values.keys()].filter(i=>adjacent(i,gap)&&i!==last);
   const index=next[Math.floor(Math.random()*next.length)]??next[0];
   [values[gap],values[index]]=[values[index],values[gap]];
   last=gap;gap=index;
  }
  if(solved(values)){[values[7],values[8]]=[values[8],values[7]]}
  moves=0;setScore(0);show('Put the tiles in numerical order.');render();
 }
 function nextMemory(){
  if(ended)return;
  pending=true;memoryInput=0;level++;setScore(level);
  memorySeq.push(Math.floor(Math.random()*9));
  show('Watch the pattern for level '+level+'…');
  render();
  let delay=600;
  for(const index of memorySeq){
   schedule(()=>render(index),delay);
   schedule(()=>render(-1),delay+410);
   delay+=650;
  }
  schedule(()=>{if(!ended){pending=false;show('Your turn: repeat '+memorySeq.length+' tiles in order.');render()}},delay+300);
 }
 function reset(){
  clearTimers();ended=false;pending=false;memoryInput=0;level=0;values=[];
  if(mode==='slide'){newSlide();return}
  if(mode==='xo'){
   values=Array(9).fill('');moves=0;setScore(0);
   show('You are X. Tap any empty square to start.');render();return;
  }
  values=Array(9).fill('');
  nextMemory();
 }
 function choose(index){
  if(ended||pending||index<0||index>8)return;
  if(mode==='slide'){
   const gap=values.indexOf(0);
   if(!adjacent(index,gap))return;
   [values[index],values[gap]]=[values[gap],values[index]];
   setScore(++moves);
   if(solved(values)){ended=true;show('Solved in '+moves+' moves! Start a new puzzle.')}
   render();return;
  }
  if(mode==='xo'){
   if(values[index])return;
   values[index]='X';moves++;setScore(moves);
   const first=winner(values);
   if(first){finishXO(first);return}
   pending=true;show('Computer is choosing a square…');render();
   schedule(()=>{
    if(ended)return;
    const slot=bestMove(values);
    if(slot>=0)values[slot]='O';
    pending=false;
    const outcome=winner(values);
    if(outcome)finishXO(outcome);
    else{show('Your turn. Place X in an empty square.');render()}
   },210);
   return;
  }
  if(index!==memorySeq[memoryInput]){
   ended=true;show('Pattern missed. You reached level '+level+'. Play again to retry.');render();return;
  }
  memoryInput++;
  if(memoryInput===memorySeq.length){
   pending=true;show('Correct! Level '+level+' completed.');
   render(index);
   schedule(()=>nextMemory(),700);
  }else{
   show('Correct. '+(memorySeq.length-memoryInput)+' more tiles.');
   render();
  }
 }
 document.getElementById('restart').addEventListener('click',reset);
 document.getElementById('hint').addEventListener('click',()=>show(cfg.description));
 document.addEventListener('keydown',event=>{
  if(mode!=='slide'||ended)return;
  const gap=values.indexOf(0);
  const targets={ArrowLeft:gap%3<2?gap+1:-1,ArrowRight:gap%3>0?gap-1:-1,
   ArrowUp:gap<6?gap+3:-1,ArrowDown:gap>2?gap-3:-1};
  if(Object.hasOwn(targets,event.key)){event.preventDefault();choose(targets[event.key])}
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&mode==='memory'&&!ended){
   clearTimers();pending=true;show('Pattern paused because the tab is hidden. Press New round to restart.');
  }
 });
 window.addEventListener('pagehide',clearTimers);
 reset();
 window.aioThreeByThree={mode,adjacent,solved,winner,bestMove,reset,getState:()=>({values:[...values],ended,pending,moves,level})};
})();
