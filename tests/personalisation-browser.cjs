'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.cwd();
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end();return}const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(bytes)})});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1365,height:900}}),page=await context.newPage();
  await page.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().startsWith('data:')?route.continue():route.abort());
  await page.goto(origin);await page.waitForSelector('#aioOnboarding.open');
  await page.locator('#aioStartSetup').click();await page.locator('#aioNext').click();await page.locator('#aioNext').click();
  await page.locator('#aioOnboardContent [data-cursor-choice="ocean"]').click();
  const previews=page.locator('.aio-cursor-images img');assert.ok(await previews.count()>=20);
  assert.ok(await previews.evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)));
  await page.locator('#aioOnboardContent').getByLabel('Cursor size',{exact:true}).selectOption('36');
  assert.match(await page.locator('body').evaluate(el=>getComputedStyle(el).cursor),/data:image/);
  await page.locator('#aioOnboardClose').click();await page.reload();await page.waitForTimeout(1100);
  assert.equal(await page.locator('#aioOnboarding').evaluate(el=>el.classList.contains('open')),false);
  assert.equal(await page.evaluate(()=>window.AIOAppearance.getState().cursorStyle),'ocean');
  await page.evaluate(()=>window.AIONotifications.setSettings({theme:'minimal'}));
  await page.evaluate(()=>{window.AIONotifications.notify('Browser regression','Once');window.AIONotifications.notify('Browser regression','Once')});
  assert.equal(await page.locator('.aio-notice-title').filter({hasText:'Browser regression'}).count(),1);
  await page.evaluate(()=>window.openSettings());
  assert.ok(await page.locator('#aioNoticeHistory li').count()>0);
  await page.locator('#settingsModal').getByLabel('Cursor size',{exact:true}).selectOption('48');
  await page.locator('#aioCursorStyleSelect').selectOption('default');
  assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).cursor),'auto');
  await page.evaluate(()=>window.closeSettings());
  for(const nav of ['top','bottom','left','right']){await page.evaluate(nav=>window.AIOAppearance.setChoice({navPosition:nav}),nav);await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.setViewportSize({width:1365,height:900})}
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.AIONotifications.preview());
  assert.equal(await page.locator('.aio-notice').last().evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.evaluate(()=>window.AIONotifications.setSettings({enabled:false}));assert.equal(await page.locator('.aio-notice').count(),0);
  // Check one existing local game responds to input, without asserting third-party playback.
  await page.goto(origin+'/games/3x3-originals.html?game=xo');await page.waitForSelector('button');
  await page.screenshot({path:'browser-game.png'});
  await page.goto(origin);await page.waitForTimeout(1000);await page.evaluate(()=>window.openSettings());await page.screenshot({path:'browser-settings.png'});
  console.log('Chromium: cursor images/application/reset, setup persistence, notice dedupe/history, narrow layouts and reduced motion passed.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
