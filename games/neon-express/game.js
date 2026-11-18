import {LANES,laneCenter,changeLane,gameSpeed,spawnGap,collides,nearMiss,runPoints,chooseTrafficLane,clamp} from './logic.mjs';

/* NEON EXPRESS: original 3D arcade game. Fictional traffic simulation, not real-world driving advice. */
const $=id=>document.getElementById(id);
const ui={scene:$('scene'),overlay:$('overlay'),menuTitle:$('menuTitle'),menuLabel:$('menuLabel'),menuDescription:$('menuDescription'),menuStatus:$('menuStatus'),start:$('start'),score:$('score'),best:$('best'),distance:$('distance'),combo:$('combo'),note:$('note'),sound:$('sound'),pause:$('pause'),left:$('left'),right:$('right'),live:$('gameStatus')};
const BEST_KEY='aio.neon-express.best.v1';
let best=0;try{best=clamp(Number(localStorage.getItem(BEST_KEY))||0,0,1e9)}catch{}
ui.best.textContent=String(Math.floor(best)).padStart(5,'0');
let THREE,renderer,scene,camera,car,world,nightLights,ground,stars,starPositions,buildings=[],lamps=[],roadLines=[],traffic=[],materials;
let viewReady=false,lastFrame=0,frame=0,updateCounter=0,engineOsc=null,engineGain=null,audio=null,audioFilter=null;
const state={mode:'menu',lane:1,x:0,distance:0,near:0,seconds:0,spawnClock:1,score:0,lastLane:-1,noteClock:0,shake:0,speed:37};
const isMobile=()=>window.innerWidth<720||window.matchMedia('(pointer:coarse)').matches;
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function message(text){ui.live.textContent=text}
function setMenu(title,body,action,label='NEON EXPRESS · ORIGINAL 3D'){
 ui.menuTitle.innerHTML=title;ui.menuDescription.textContent=body;ui.start.textContent=action;ui.menuLabel.textContent=label;
 ui.overlay.hidden=false;
}
function saveBest(){
 if(state.score>best){best=state.score;try{localStorage.setItem(BEST_KEY,String(best))}catch{}}
 ui.best.textContent=String(best).padStart(5,'0');
}
function showNote(text){
 if(reduceMotion)return;
 ui.note.textContent=text;ui.note.classList.remove('show');void ui.note.offsetWidth;ui.note.classList.add('show');
}
function moveLane(delta){
 if(state.mode!=='running')return;
 const target=changeLane(state.lane,delta);
 if(target===state.lane)return;
 state.lane=target;
 message('Changed to lane '+(target+1));
 if(audio)beep(200,.045,.028);
}
function resetWorld(){
 for(const item of traffic){world.remove(item.mesh);disposeCar(item.mesh)}
 traffic=[];
 state.lane=1;state.x=laneCenter(1);state.distance=0;state.near=0;state.seconds=0;state.spawnClock=1.9;state.score=0;state.lastLane=-1;state.speed=37;state.shake=0;
 car.position.x=0;car.position.y=0;car.rotation.set(0,0,0);
 for(const stripe of roadLines)stripe.position.z=stripe.userData.initialZ;
 for(const item of [...buildings,...lamps])item.position.z=item.userData.initialZ;
 ui.score.textContent='00000';ui.distance.innerHTML='0 <em>m</em>';ui.combo.classList.remove('active');
}
function start(){
 if(!viewReady){ui.menuStatus.textContent='3D engine is still loading, or WebGL is unavailable.';return}
 resetWorld();
 state.mode='running';lastFrame=0;
 ui.overlay.hidden=true;ui.pause.textContent='Pause';ui.menuStatus.textContent='';
 message('Night run started. Use left and right to avoid cars.');
 if(audio?.state==='suspended')audio.resume().catch(()=>{});
}
function pause(){
 if(state.mode==='running'){
  state.mode='paused';
  setMenu('RUN<br><span>PAUSED</span>','Your run is paused. Resume when you are ready.','RESUME RUN','PAUSE');
  ui.pause.textContent='Resume';message('Game paused.');
 }else if(state.mode==='paused'){
  resume();
 }
}
function resume(){
 if(state.mode!=='paused')return;
 state.mode='running';lastFrame=0;ui.overlay.hidden=true;ui.pause.textContent='Pause';message('Run resumed.');
}
function crash(){
 if(state.mode!=='running')return;
 state.mode='over';state.shake=.7;beep(82,.32,.08);
 saveBest();
 setMenu('RUN<br><span>COMPLETE</span>','Score '+state.score.toLocaleString('en-GB')+' · '+Math.floor(state.distance)+' m travelled · '+state.near+' near misses. Each new run has fresh traffic.','TRY AGAIN','NIGHT RUN RESULTS');
 message('Run over. Score '+state.score+'. Best '+best+'.');
}

function box(w,h,d,material){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material)}
function makeWindowMap(seed){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;
 const c=canvas.getContext('2d');
 c.fillStyle='#0d172b';c.fillRect(0,0,128,256);
 for(let row=0;row<23;row++)for(let col=0;col<9;col++){
  const r=Math.sin((row*35+col*17+seed*13)*12.9898)*43758.5453;
  const v=r-Math.floor(r);
  c.fillStyle=v>.66?'#8cd9eb':v>.38?'#385878':v>.19?'#e1ba8b':'#1d2c46';
  c.fillRect(6+col*13,6+row*11,7,5);
 }
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
 t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.RepeatWrapping;
 t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 return t;
}
function makeCar(color,isPlayer=false){
 const group=new THREE.Group();
 const paint=new THREE.MeshStandardMaterial({color,metalness:.75,roughness:.25});
 const dark=materials.dark,chrome=materials.chrome,glass=materials.glass;
 const body=box(2.2,.63,4.55,paint);body.position.y=.67;body.castShadow=true;body.receiveShadow=true;group.add(body);
 const nose=box(2.08,.25,1.25,paint);nose.position.set(0,.51,-1.72);nose.castShadow=true;group.add(nose);
 const cabin=box(1.75,.78,2.3,glass);cabin.position.set(0,1.22,-.22);cabin.castShadow=true;group.add(cabin);
 const roof=box(1.7,.15,1.7,paint);roof.position.set(0,1.64,-.23);roof.castShadow=true;group.add(roof);
 const windshield=box(1.62,.09,1.16,new THREE.MeshStandardMaterial({color:0x2c4c6b,metalness:.65,roughness:.18,transparent:true,opacity:.95}));
 windshield.rotation.x=-.52;windshield.position.set(0,1.31,-1.26);group.add(windshield);
 const tail=box(1.75,.09,.1,materials.red);tail.position.set(0,.85,2.29);group.add(tail);
 const front=box(1.9,.09,.1,materials.light);front.position.set(0,.65,-2.29);group.add(front);
 for(const side of [-1,1])for(const z of [-1.39,1.36]){
  const tyre=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.33,14),dark);
  tyre.rotation.z=Math.PI/2;tyre.position.set(side*1.12,.43,z);tyre.castShadow=true;group.add(tyre);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.34,12),chrome);
  rim.rotation.z=Math.PI/2;rim.position.copy(tyre.position);group.add(rim);
 }
 const bumper=box(2.12,.12,.15,chrome);bumper.position.set(0,.38,2.33);group.add(bumper);
 if(isPlayer){
  const stripe=box(.42,.035,4.17,materials.cyan);
  stripe.position.set(0,1.015,-.01);group.add(stripe);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(3.7,6),new THREE.MeshBasicMaterial({color:0x28d6f1,transparent:true,opacity:.13,depthWrite:false,side:THREE.DoubleSide}));
  glow.rotation.x=-Math.PI/2;glow.position.y=.025;group.add(glow);
 }else{
  const left=box(.7,.1,.14,materials.red),right=left.clone();
  left.position.set(-.65,.74,2.33);right.position.set(.65,.74,2.33);group.add(left,right);
 }
 group.userData.isCar=true;
 return group;
}
function disposeCar(group){
 group.traverse(child=>{if(child.isMesh){child.geometry?.dispose();const ms=Array.isArray(child.material)?child.material:[child.material];for(const m of ms){if(m&&!Object.values(materials||{}).includes(m))m.dispose();}}});
}
function makeRoad(){
 const asphalt=new THREE.MeshStandardMaterial({color:0x101925,roughness:.38,metalness:.39});
 const road=box(13.8,.16,360,asphalt);
 road.position.set(0,-.12,-70);road.receiveShadow=true;world.add(road);
 ground=new THREE.Mesh(new THREE.PlaneGeometry(600,370),new THREE.MeshStandardMaterial({color:0x070e1c,roughness:.86}));
 ground.rotation.x=-Math.PI/2;ground.position.set(0,-.25,-70);ground.receiveShadow=true;world.add(ground);
 const edgeMaterial=materials.cyan;
 for(const side of [-1,1]){
  const curb=box(.2,.1,360,side===1?materials.pink:edgeMaterial);
  curb.position.set(side*6.83,.035,-70);world.add(curb);
  const shoulder=box(1.1,.12,360,new THREE.MeshStandardMaterial({color:0x253046,metalness:.3}));
  shoulder.position.set(side*7.46,-.11,-70);world.add(shoulder);
 }
 for(const x of [-1.85,1.85])for(let i=0;i<30;i++){
  const stripe=box(.105,.02,4.4,materials.lane);
  const z=-205+i*8;
  stripe.position.set(x,.001,z);stripe.userData.initialZ=z;
  world.add(stripe);roadLines.push(stripe);
 }
 for(let i=0;i<30;i++){
  const z=-205+i*8;
  const accent=box(.13,.035,.35,i%3===0?materials.pink:materials.cyan);
  accent.position.set(i%2===0?-6.25:6.25,.028,z);
  accent.userData.initialZ=z;world.add(accent);roadLines.push(accent);
 }
}
function buildCity(){
 const textureMaps=[makeWindowMap(1),makeWindowMap(2),makeWindowMap(3),makeWindowMap(4),makeWindowMap(5)];
 for(const side of [-1,1]){
  for(let i=0;i<27;i++){
   const z=-218+i*9.25;
   const h=9+(i*17+side*37+100)%35;
   const w=6+(i*11+37)%6;
   const x=side*(13+(i*7%17));
   const mat=new THREE.MeshStandardMaterial({map:textureMaps[i%textureMaps.length],color:i%3===0?0x7188b3:0x546a8f,roughness:.76,metalness:.1,emissive:0x152d44,emissiveMap:textureMaps[i%textureMaps.length],emissiveIntensity:.29});
   const mesh=box(w,h,w,mat);
   mesh.position.set(x,h*.5-.22,z);mesh.userData.initialZ=z;
   mesh.receiveShadow=true;world.add(mesh);buildings.push(mesh);
   if(i%5===0){
    const panel=box(w*.92,.3,.3,i%2?materials.cyan:materials.pink);
    panel.position.set(0,h*.5-.09,w*.5+.2);mesh.add(panel);
    // Panels are decorative city lights, not interactive or advertisements.
   }
  }
  for(let i=0;i<13;i++){
   const z=-205+i*19;
   const pole=new THREE.Group();
   const stem=box(.15,8,.16,materials.pole);
   stem.position.y=4;pole.add(stem);
   const arm=box(2.3,.15,.15,materials.pole);
   arm.position.set(-side*1.09,7.92,0);pole.add(arm);
   const lamp=box(1.4,.14,.42,materials.light);
   lamp.position.set(-side*2.08,7.78,0);pole.add(lamp);
   pole.position.set(side*9.2,0,z);pole.userData.initialZ=z;
   world.add(pole);lamps.push(pole);
  }
 }
 const skylineSign=document.createElement('canvas');skylineSign.width=512;skylineSign.height=128;
 const ctx=skylineSign.getContext('2d');
 ctx.fillStyle='#101e40';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#6de6f5';ctx.lineWidth=7;ctx.strokeRect(9,9,494,110);
 ctx.fillStyle='#9efaff';ctx.textAlign='center';ctx.font='900 60px sans-serif';ctx.fillText('NIGHT RUN',256,82);
 const signTexture=new THREE.CanvasTexture(skylineSign);signTexture.colorSpace=THREE.SRGBColorSpace;
 const signMat=new THREE.MeshBasicMaterial({map:signTexture,side:THREE.DoubleSide});
 const billboard=new THREE.Mesh(new THREE.PlaneGeometry(16,4),signMat);
 billboard.position.set(0,25,-148);world.add(billboard);
 const moonMat=new THREE.MeshBasicMaterial({color:0xadc4e5});
 const moon=new THREE.Mesh(new THREE.SphereGeometry(9,24,16),moonMat);
 moon.position.set(-78,59,-190);world.add(moon);
}
function makeParticles(){
 const count=isMobile()?85:180;
 const p=new Float32Array(count*3);
 for(let i=0;i<count;i++){p[i*3]=(Math.random()-.5)*48;p[i*3+1]=Math.random()*19+1;p[i*3+2]=Math.random()*-195+20;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));
 stars=new THREE.Points(geo,new THREE.PointsMaterial({color:0x8db6e9,size:isMobile()?.11:.13,transparent:true,opacity:.67,depthWrite:false}));
 starPositions=p;world.add(stars);
}
function buildScene(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x090f20);scene.fog=new THREE.FogExp2(0x0d1b35,.012);
 renderer=new THREE.WebGLRenderer({antialias:!isMobile(),alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,isMobile()?1.35:1.75));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
 if(!isMobile()){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}
 ui.scene.appendChild(renderer.domElement);
 camera=new THREE.PerspectiveCamera(61,1,.1,260);
 scene.add(new THREE.HemisphereLight(0x91b4ff,0x18213a,2));
 const sunlight=new THREE.DirectionalLight(0xc5c9ff,2.6);
 sunlight.position.set(17,38,-15);sunlight.castShadow=!isMobile();
 if(sunlight.castShadow){sunlight.shadow.mapSize.set(1024,1024);sunlight.shadow.camera.left=-35;sunlight.shadow.camera.right=35;sunlight.shadow.camera.top=35;sunlight.shadow.camera.bottom=-35;sunlight.shadow.camera.far=130;}
 scene.add(sunlight);
 nightLights=new THREE.Group();nightLights.add(new THREE.PointLight(0x22aefa,29,32),new THREE.PointLight(0xff52a4,17,32));
 nightLights.children[0].position.set(-8,4,-15);nightLights.children[1].position.set(8,4,-17);scene.add(nightLights);
 materials={
  dark:new THREE.MeshStandardMaterial({color:0x050b16,metalness:.24,roughness:.89}),
  chrome:new THREE.MeshStandardMaterial({color:0x94aec2,metalness:.91,roughness:.19}),
  glass:new THREE.MeshPhysicalMaterial({color:0x243651,metalness:.22,roughness:.13,transparent:true,opacity:.93}),
  red:new THREE.MeshBasicMaterial({color:0xff355d}),
  cyan:new THREE.MeshBasicMaterial({color:0x33f4ed}),
  pink:new THREE.MeshBasicMaterial({color:0xe253c4}),
  lane:new THREE.MeshBasicMaterial({color:0x88a8c4}),
  light:new THREE.MeshBasicMaterial({color:0xd5f4ff}),
  pole:new THREE.MeshStandardMaterial({color:0x475b77,metalness:.5,roughness:.5})
 };
 world=new THREE.Group();scene.add(world);
 makeRoad();buildCity();makeParticles();
 car=makeCar(0x0e9ce6,true);car.position.set(0,0,5);world.add(car);
 const headlights=new THREE.SpotLight(0xcceeff,70,48,Math.PI/5,.8,1.4);
 headlights.position.set(0,1.18,2);headlights.target.position.set(0,-.1,-18);
 car.add(headlights,headlights.target);
 resize();
}

function spawnTraffic(){
 const lane=chooseTrafficLane(state.lastLane,Math.random());state.lastLane=lane;
 const palette=[0xe82a65,0xf6b154,0x637fdc,0x74c5c7,0xc0cad8,0x957ec8];
 const object=makeCar(palette[Math.floor(Math.random()*palette.length)]);
 object.position.set(LANES[lane],0,-175);
 object.rotation.y=0;
 world.add(object);
 traffic.push({mesh:object,lane,z:-175,scored:false,near:false});
}
function advanceRoad(dt,speed){
 for(const stripe of roadLines){stripe.position.z+=speed*dt;if(stripe.position.z>24)stripe.position.z-=240;}
 for(const building of buildings){building.position.z+=speed*dt*.55;if(building.position.z>36)building.position.z-=252;}
 for(const lamp of lamps){lamp.position.z+=speed*dt;if(lamp.position.z>32)lamp.position.z-=247;}
 if(stars){
  for(let i=0;i<starPositions.length;i+=3){starPositions[i+2]+=dt*speed*.65;if(starPositions[i+2]>20)starPositions[i+2]=-198;}
  stars.geometry.attributes.position.needsUpdate=true;
 }
}
function advanceTraffic(dt,speed){
 for(let i=traffic.length-1;i>=0;i--){
  const item=traffic[i];
  item.z+=speed*dt*.91;item.mesh.position.z=item.z;
  if(!item.scored&&collides(state.x,5,item.mesh.position.x,item.z)){crash();return}
  if(!item.scored&&item.z>8.4){
   item.scored=true;
   if(nearMiss(state.x,5,item.mesh.position.x,8.0)){
    state.near++;state.score=runPoints(state.distance,state.near);
    ui.combo.textContent='NEAR MISS +80 · '+state.near;
    ui.combo.classList.add('active');state.noteClock=2;showNote('CLOSE CALL +80');beep(790,.11,.045);
   }
  }
  if(item.z>26){
   world.remove(item.mesh);disposeCar(item.mesh);traffic.splice(i,1);
  }
 }
}
function update(dt){
 if(state.mode!=='running')return;
 state.seconds+=dt;
 state.speed=gameSpeed(state.distance);
 state.distance+=state.speed*dt;
 const toward=laneCenter(state.lane),difference=toward-state.x;
 state.x+=difference*Math.min(1,dt*9);
 car.position.x=state.x;
 car.rotation.z=clamp(-difference*.033,-.14,.14);
 car.rotation.x=Math.sin(state.seconds*9)*.008;
 car.position.y=Math.sin(state.seconds*12)*.017;
 advanceRoad(dt,state.speed);
 state.spawnClock-=dt;
 if(state.spawnClock<=0){
  spawnTraffic();state.spawnClock=spawnGap(state.distance)+(Math.random()-.5)*.14;
 }
 advanceTraffic(dt,state.speed);
 if(state.mode!=='running')return;
 state.score=runPoints(state.distance,state.near);
 if(state.noteClock>0){
  state.noteClock-=dt;if(state.noteClock<=0)ui.combo.classList.remove('active');
 }
 if(engineOsc)engineOsc.frequency.setTargetAtTime(45+state.speed*.7,audio.currentTime,.16);
 updateCounter+=dt;
 if(updateCounter>.09){
  ui.score.textContent=String(state.score).padStart(5,'0');
  ui.distance.innerHTML=Math.floor(state.distance)+' <em>m</em>';updateCounter=0;
 }
}
function renderFrame(time){
 requestAnimationFrame(renderFrame);
 if(!viewReady)return;
 const dt=lastFrame?Math.min((time-lastFrame)/1000,.043):0;
 lastFrame=time;
 if(state.mode==='running')update(dt);
 const mobile=isMobile();
 const ratio=mobile?.18:.15;
 const targetX=state.x*ratio;
 const wantY=mobile?10.5:8;
 const wantZ=mobile?27:19;
 camera.position.x+=(targetX-camera.position.x)*.04;
 camera.position.y+=(wantY-camera.position.y)*.05;
 camera.position.z+=(wantZ-camera.position.z)*.05;
 const focus=new THREE.Vector3(targetX*.4,1,mobile?-12:-21);
 camera.lookAt(focus);
 if(state.shake>0){state.shake=Math.max(0,state.shake-dt);if(!reduceMotion){camera.position.x+=(Math.random()-.5)*state.shake*.6;camera.position.y+=(Math.random()-.5)*state.shake*.2;}}
 if(car){car.visible=true;}
 renderer.render(scene,camera);
 frame++;
}
function resize(){
 if(!viewReady&&!renderer)return;
 const w=Math.max(280,ui.scene.clientWidth),h=Math.max(420,ui.scene.clientHeight);
 renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.fov=w<h?72:61;camera.updateProjectionMatrix();
}
function beep(frequency,duration,volume){
 if(!audio)return;
 try{
  const o=audio.createOscillator(),g=audio.createGain();
  o.type='sine';o.frequency.setValueAtTime(frequency,audio.currentTime);
  g.gain.setValueAtTime(0,audio.currentTime);
  g.gain.linearRampToValueAtTime(volume,audio.currentTime+.01);
  g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
  o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration+.01);
 }catch{}
}
async function toggleSound(){
 if(audio){
  try{await audio.close()}catch{}
  audio=null;engineOsc=null;engineGain=null;audioFilter=null;
  ui.sound.textContent='Sound off';ui.sound.setAttribute('aria-pressed','false');return;
 }
 try{
  audio=new (window.AudioContext||window.webkitAudioContext)();
  engineOsc=audio.createOscillator();engineGain=audio.createGain();audioFilter=audio.createBiquadFilter();
  engineOsc.type='sawtooth';engineOsc.frequency.value=76;
  audioFilter.type='lowpass';audioFilter.frequency.value=155;
  engineGain.gain.value=.012;
  engineOsc.connect(audioFilter).connect(engineGain).connect(audio.destination);engineOsc.start();
  ui.sound.textContent='Sound on';ui.sound.setAttribute('aria-pressed','true');
 }catch(error){ui.menuStatus.textContent='Audio is unavailable in this browser.';audio=null}
}
ui.start.addEventListener('click',()=>{if(state.mode==='paused')resume();else start()});
ui.pause.addEventListener('click',pause);
ui.sound.addEventListener('click',toggleSound);
ui.left.addEventListener('click',()=>moveLane(-1));
ui.right.addEventListener('click',()=>moveLane(1));
window.addEventListener('keydown',event=>{
 if(['ArrowLeft','ArrowRight','a','A','d','D',' ','p','P','Enter'].includes(event.key)&&['BUTTON','INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
 if(['ArrowLeft','a','A'].includes(event.key)){event.preventDefault();if(!event.repeat)moveLane(-1);}
 else if(['ArrowRight','d','D'].includes(event.key)){event.preventDefault();if(!event.repeat)moveLane(1);}
 else if([' ','p','P'].includes(event.key)){event.preventDefault();pause();}
 else if(event.key==='Enter'&&state.mode!=='running'){event.preventDefault();if(state.mode==='paused')resume();else start();}
});
let touchX=null;
ui.scene.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')touchX=event.clientX});
ui.scene.addEventListener('pointerup',event=>{
 if(event.pointerType!=='touch'||touchX===null)return;
 const delta=event.clientX-touchX;touchX=null;
 if(Math.abs(delta)>42)moveLane(delta>0?1:-1);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='running')pause()});
window.addEventListener('blur',()=>{if(state.mode==='running')pause()});
window.addEventListener('resize',resize,{passive:true});

(async()=>{
 try{
  ui.menuStatus.textContent='Loading the 3D city...';
  THREE=await import('three');
  buildScene();
  viewReady=true;resize();
  state.mode='menu';
  ui.menuStatus.textContent='Ready. Your best score is stored only on this device.';
  requestAnimationFrame(renderFrame);
 }catch(error){
  ui.menuStatus.textContent='Could not start WebGL. Check your browser supports 3D graphics and that the game engine was allowed to load.';
  ui.start.disabled=true;
  console.error('NEON EXPRESS failed to initialise:',error);
 }
})();
