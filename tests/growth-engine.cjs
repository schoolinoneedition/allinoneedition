'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const owner = fs.readFileSync('owner.html','utf8');
const gamesPage = fs.readFileSync('browser-games.html','utf8');
const homepage = fs.readFileSync('index.html','utf8');
const authorized = fs.readFileSync('ads.txt','utf8');
assert.equal(authorized.trim(),'google.com, pub-4571610192955651, DIRECT, f08c47fec0942fa0');
assert.match(owner,/id="ownerWorkspace" hidden/);
assert.ok(owner.indexOf('id="ownerGrowthDesk"')>owner.indexOf('id="ownerWorkspace"') && owner.indexOf('id="ownerGrowthDesk"')<owner.indexOf('</div></main>'),'Growth desk stays inside protected owner workspace');
assert.match(owner,/id="growthCalculator"/);
assert.match(owner,/src="\/aio-growth-desk\.js" defer/);
assert.match(homepage,/href="\/browser-games#daily-original"/);
assert.match(gamesPage,/id="daily-original"/);
assert.match(gamesPage,/src="\/aio-daily-original\.js" defer/);
assert.match(gamesPage,/No sign-up or prize/);

class Control{
 constructor(value=''){this.value=value;this.textContent='';this.hidden=false;this.href='';this.listeners={};this.focused=false;this.selected=false}
 addEventListener(type,fn){this.listeners[type]=fn}
 focus(){this.focused=true}
 select(){this.selected=true}
}
const growthIds=['growthCalculator','growthViews','growthRpm','growthOther','growthCosts','growthGross','growthNet','growthBreakEven','growthResult'];
const controls=new Map(growthIds.map(id=>[id,new Control()]));
const growthCtx={window:{},document:{getElementById:id=>controls.get(id)||null},Intl,Number,Math};
vm.runInNewContext(fs.readFileSync('aio-growth-desk.js','utf8'),growthCtx);
const estimate=growthCtx.window.aioGrowthEstimate;
assert.equal(typeof estimate,'function');
const calc=estimate(10000,2,50,30);
assert.equal(calc.ads,20);
assert.equal(calc.gross,70);
assert.equal(calc.net,40);
assert.equal(calc.breakEvenViews,0);
assert.equal(estimate(1000,2,0,20).breakEvenViews,10000);
assert.equal(estimate(1000,0,0,20).breakEvenViews,null);
assert.equal(estimate(-1,2,0,0),null);
assert.equal(estimate(Number.POSITIVE_INFINITY,2,0,0),null);
controls.get('growthViews').value='10000';
controls.get('growthRpm').value='2';
controls.get('growthOther').value='50';
controls.get('growthCosts').value='30';
let prevented=false;
controls.get('growthCalculator').listeners.submit({preventDefault(){prevented=true}});
assert.equal(prevented,true);
assert.equal(controls.get('growthGross').textContent,'£70.00');
assert.equal(controls.get('growthNet').textContent,'£40.00');
assert.match(controls.get('growthResult').textContent,/not actual AIO earnings or traffic/);

const dailyIds=['aioDailyGameName','aioDailyGameOpen','aioDailyGameShare','aioDailyGameDesc','aioDailyGameStatus','aioDailyGameLink'];
const daily=new Map(dailyIds.map(id=>[id,new Control()]));
const copied=[];
const dailyCtx={
 Date,Math,Number,URL,
 window:{},
 document:{getElementById:id=>daily.get(id)||null},
 navigator:{clipboard:{writeText:async text=>copied.push(text)}},
 location:{origin:'https://allinoneedition.vercel.app'}
};
vm.runInNewContext(fs.readFileSync('aio-daily-original.js','utf8'),dailyCtx);
const pick=dailyCtx.window.aioDailyOriginalPick;
assert.equal(typeof pick,'function');
const expected=['3×3 Tile Slide','3×3 Tic Tac Toe','3×3 Pattern Recall','Circuit Snake','Merge Matrix','Orbit Dash','Colour Catch'];
for(let i=0;i<7;i++)assert.equal(pick(i*86400000).name,expected[i]);
assert.equal(pick(7*86400000).name,expected[0]);
for(const g of expected)assert.ok(g);
assert.ok(/^\/games\/(3x3-originals|bonus-arcade)\.html\?game=/.test(daily.get('aioDailyGameOpen').href));
(async()=>{
 await daily.get('aioDailyGameShare').listeners.click();
 assert.equal(copied.length,1);
 assert.ok(copied[0].startsWith('https://allinoneedition.vercel.app/games/'));
 assert.match(daily.get('aioDailyGameStatus').textContent,/Link copied/);
 dailyCtx.navigator.clipboard=null;
 await daily.get('aioDailyGameShare').listeners.click();
 assert.equal(daily.get('aioDailyGameLink').hidden,false);
 assert.equal(daily.get('aioDailyGameLink').value,copied[0]);
 assert.equal(daily.get('aioDailyGameLink').focused,true);
 assert.equal(daily.get('aioDailyGameLink').selected,true);
 console.log('Growth readiness passed: exact ads.txt, owner-gated calculator, zero-fake-metrics estimates, seven original daily picks, share and fallback.');
})().catch(error=>{console.error(error);process.exitCode=1});
