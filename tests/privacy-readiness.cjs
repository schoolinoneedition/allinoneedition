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
assert.match(policy, /AdSense ads are not activated/);
assert.match(policy, /certified consent management platform/);
assert.match(policy, /\/_vercel\/insights\/script\.js/);
assert.match(fs.readFileSync('sitemap.xml','utf8'), /<loc>https:\/\/allinoneedition\.vercel\.app\/privacy<\/loc>/);

for(const path of ['index.html','about.html','anime.html','study.html','browser-games.html','3x3-games.html']){
 const html=fs.readFileSync(path,'utf8');
 assert.ok(html.includes('href="/privacy"'), 'Privacy page must be linked from '+path);
}

for(const path of ['index.html','about.html','anime.html','study.html','browser-games.html','3x3-games.html','privacy.html','elementor.html','social.html','video.html']){
 const html=fs.readFileSync(path,'utf8');
 assert.doesNotMatch(html,/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/,'Do not activate unverified AdSense account on '+path);
}
const checklist=fs.readFileSync('docs/adsense-readiness.md','utf8');
assert.match(checklist,/at least 18/);
assert.match(checklist,/Google-certified IAB TCF CMP/);
console.log('Privacy readiness passed: published route, linked disclosure, no unauthorised AdSense activation and verified checklist.');
