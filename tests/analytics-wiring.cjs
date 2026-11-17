'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const pages=['index.html','anime.html','social.html','elementor.html','study.html','browser-games.html','3x3-games.html','about.html','video.html'];
for(const name of pages){
 const html=fs.readFileSync(name,'utf8');
 const script=html.match(/<script defer src="\/_vercel\/insights\/script\.js"><\/script>/g)||[];
 assert.equal(script.length,1,'Vercel Web Analytics script must occur exactly once on '+name);
 assert.ok(html.includes('window.va=window.va||function()'),'Vercel analytics queue missing on '+name);
}
const privateOwner=fs.readFileSync('owner.html','utf8');
assert.doesNotMatch(privateOwner,/\/_vercel\/insights\/script\.js/,'Do not inject analytics into private owner tools');
console.log('Analytics wiring passed on nine public pages; dashboard activation required to collect traffic.');
