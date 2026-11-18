/* Pure game rules: a fictional 3-lane night-city arcade run. */
export const LANES=Object.freeze([-3.7,0,3.7]);
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function laneCenter(index){return LANES[clamp(Math.trunc(index)||0,0,2)]}
export function changeLane(current,dir){return clamp((Math.trunc(current)||0)+Math.sign(dir),0,2)}
export function gameSpeed(distance){return clamp(37+Math.max(0,distance)*0.013,37,71)}
export function spawnGap(distance){return clamp(1.55-Math.max(0,distance)*0.00014,0.84,1.55)}
export function collides(playerX,playerZ,otherX,otherZ){
 return Math.abs(playerX-otherX)<1.88 && Math.abs(playerZ-otherZ)<3.2;
}
export function nearMiss(playerX,playerZ,otherX,otherZ){
 const dx=Math.abs(playerX-otherX),dz=Math.abs(playerZ-otherZ);
 return dx>=1.88 && dx<5.65 && dz<3.1;
}
export function runPoints(distance,nearMissCount){return Math.floor(Math.max(0,distance)*0.72)+Math.max(0,Math.floor(nearMissCount))*80}
export function chooseTrafficLane(last,random){
 const n=clamp(Math.floor(random*3),0,2);
 return last===n && random<0.62 ? (n+1)%3 : n;
}
