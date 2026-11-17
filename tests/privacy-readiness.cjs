'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const route = JSON.parse(fs.readFileSync('vercel.json','utf8'));
assert.ok(route.rewrites.some(r => r.source === '/privacy' && r.destination === '/privacy.html'), 'Privacy page must have a clean route');

const policy = fs.readFileSync('privacy.html','utf8');
assert.match(policy, /<title>Privacy & Cookies/);
assert.match(policy, /Browser storage is local|Browser storage is local|Browser storage is local|Browser storage is local/);
assert.match(policy, /Supabase/);
assert.match(policy, /Backblaze B2/);
assert.match(policy, /AdSense script for site ownership verification/);
assert.match(policy, /certified consent management platform/);
assert.match(policy, /\/_vercel\/insights\/script\.js/);
assert.match(fs.readFileSync('sitemap.xml','utf8'), /<loc>https:\/\/allinoneedition\.vercel\.app\/privacy<\/loc>/);

for(const path of ['index.html','about.html','anime.html','study.html','browser-games.html','3x3-games.html']){
 const html=fs.readFileSync(path,'utf8');
 assert.ok(html.includes('href="/privacy"'), 'Privacy page must be linked from '+path);
}

const publisherScript='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4571610192955651"'+String.fromCharCode(10)+'     crossorigin="anonymous"></script>';
for(const path of ['index.html','about.html','anime.html','study.html','browser-games.html','3x3-games.html','privacy.html','elementor.html','social.html','video.html']){
 const html=fs.readFileSync(path,'utf8');
 const head=html.slice(0,html.indexOf('</head>'));
 assert.equal(head.split(publisherScript).length-1,1,'Exact approved AdSense snippet must be present once in the head of '+path);
 assert.doesNotMatch(html,/<ins[^>]*adsbygoogle/i,'No ad units should be enabled by this change on '+path);
}
assert.doesNotMatch(fs.readFileSync('owner.html','utf8'),/pagead2\.googlesyndication\.com/,'Keep private owner panel ad-free');
const checklist=fs.readFileSync('docs/adsense-readiness.md','utf8');
assert.match(checklist,/at least 18/);
assert.match(checklist,/Google-certified IAB TCF CMP/);
console.log('Privacy readiness passed: published route, linked disclosure, exact verification tag and no ad slots and verified checklist.');
