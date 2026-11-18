'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const home=fs.readFileSync('index.html','utf8');
const social=fs.readFileSync('social.html','utf8');

function extract(source,head,after){
  const start=source.indexOf(head),end=source.indexOf(after,start);
  assert.ok(start>=0&&end>start,head+' function should be present');
  return source.slice(start,end);
}
const mainFunction=extract(home,'function aioAuthErrorMessage(error){','async function submitAuth(){');
const socialFunction=extract(social,'function socialAuthErrorMessage(error){','  function updateAuthMode(){');
const main=vm.runInNewContext(mainFunction+';aioAuthErrorMessage;');
const socialMsg=vm.runInNewContext(socialFunction+';socialAuthErrorMessage;');
for(const fn of [main,socialMsg]){
  assert.match(fn({status:402,message:'Payment Required'}),/temporarily unavailable/);
  assert.match(fn({status:402,message:'exceed_egress_quota'}),/account|existing account/);
  assert.match(fn({status:500,message:'exceed_storage_size_quota'}),/temporarily unavailable/);
  assert.doesNotMatch(fn({status:402,message:'exceed_egress_quota'}),/sign up with a different email/i);
  assert.match(fn({status:400,message:'Invalid login credentials'}),/Invalid login credentials/);
}
assert.match(home,/\$\('authStatus'\)\.textContent=aioAuthErrorMessage\(e\)/);
assert.match(social,/setStatus\('authStatus',socialAuthErrorMessage\(e\),'bad'\)/);
assert.match(social,/legacySupabaseBackgroundWarmupEnabled=false/);
assert.match(social,/if\(!legacySupabaseBackgroundWarmupEnabled\)return;/);
assert.match(social,/function prepareSocialVideo\(/,'Visible video loading must remain supported');
assert.match(social,/function socialMediaPlaybackURL\(/,'The existing playback path must remain');
assert.match(social,/\/api\/social-blob-upload/,'New uploads must continue to use Vercel Blob');
console.log('Auth quota messaging and legacy Supabase background egress protection passed.');
