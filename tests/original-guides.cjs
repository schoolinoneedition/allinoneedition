'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const urls=[
 ['tile-slide','/games/3x3-originals.html?game=slide','3×3 Tile Slide'],
 ['tic-tac-toe','/games/3x3-originals.html?game=xo','3×3 Tic Tac Toe'],
 ['pattern-recall','/games/3x3-originals.html?game=memory','3×3 Pattern Recall'],
 ['circuit-snake','/games/bonus-arcade.html?game=snake','Circuit Snake'],
 ['merge-matrix','/games/bonus-arcade.html?game=merge','Merge Matrix'],
 ['orbit-dash','/games/bonus-arcade.html?game=orbit','Orbit Dash'],
 ['colour-catch','/games/bonus-arcade.html?game=catch','Colour Catch']
];
const routes=JSON.parse(fs.readFileSync('vercel.json','utf8')).rewrites;
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const catalogue=fs.readFileSync('browser-games.html','utf8');
const titles=new Set(),descriptions=new Set();
const owner=fs.readFileSync('owner.html','utf8');
assert.doesNotMatch(owner,/pagead2\.googlesyndication\.com/,'Owner-only tools must remain excluded from AdSense');
for(const [slug,play,name] of urls){
 const route='/play/'+slug,filename='play/'+slug+'.html';
 const html=fs.readFileSync(filename,'utf8');
 assert.ok(routes.some(r=>r.source===route&&r.destination==='/'+filename),'Missing clean route '+route);
 const canonical='https://allinoneedition.vercel.app'+route;
 assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),'Missing canonical '+slug);
 assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),'Missing crawlable sitemap URL '+slug);
 assert.ok(catalogue.includes('href="'+route+'"'),'Missing link from original games catalogue '+slug);
 assert.ok(html.includes('href="'+play+'"'),'Wrong playable original game for '+slug);
 assert.ok(html.includes('<h1>Play '+name+' online</h1>'),'Original game title missing '+slug);
 const title=html.match(/<title>(.*?)<\/title>/)?.[1],description=html.match(/<meta name="description" content="([^"]+)">/)?.[1];
 assert.ok(title&&!titles.has(title),'Page title must be unique '+slug);
 assert.ok(description&&!descriptions.has(description),'Page summary must be unique '+slug);
 titles.add(title);descriptions.add(description);
 assert.ok(html.match(/<li>/g)?.length>=6,'Rules and tips missing '+slug);
 assert.ok(html.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length>=170,'Game guide is too thin '+slug);
 assert.match(html,/aria-label="Breadcrumb"/);
 assert.match(html,/"@type":"BreadcrumbList"/);
 assert.match(html,/href="\/privacy"/);
 assert.equal(html.split('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4571610192955651').length-1,1,'Keep exact AdSense snippet once on public page');
 assert.equal(html.split('/_vercel/insights/script.js').length-1,1,'Keep Web Analytics once on public page');
 assert.doesNotMatch(html,/<ins[^>]*class=["'][^"']*adsbygoogle/i,'No misleading or unapproved manual ad slots');
 assert.ok(html.includes('href="/browser-games"'));
}
assert.equal(titles.size,7);
assert.equal(descriptions.size,7);
const robots=fs.readFileSync('robots.txt','utf8');
assert.ok(!robots.includes('Disallow: /play'),'Guides must remain crawlable');
console.log('Original guide SEO passed: seven unique people-first pages, playable source links, accurate routes, sitemap, navigation, AdSense and analytics.');
