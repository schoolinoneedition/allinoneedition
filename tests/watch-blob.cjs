'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('anime.html','utf8');
const api=fs.readFileSync('api/watch-blob-upload.js','utf8');
const sql=fs.readFileSync('supabase/migrations/20261117193500_aio_watch_vercel_blob.sql','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(pkg.dependencies['@vercel/blob'],'2.9.0');
assert.match(html,/id="watchStorageProvider"/);
assert.match(html,/<option value="b2">Backblaze B2 \(default\)<\/option>/);
assert.match(html,/<option value="blob">Vercel Blob/);
assert.match(html,/await upload\(pathname,file,/);
assert.match(html,/multipart:true/);
assert.match(html,/aio_watch_blob_episodes/);
assert.match(html,/provider:'Vercel Blob'/);
assert.match(html,/saved.provider==='Vercel Blob'/);
assert.match(html,/async function uploadOwnerEpisodeVideo/,'Existing B2 upload must remain intact');
assert.match(html,/if\(previous\?\.provider==='Vercel Blob'\)/,'Switching back to B2 must remove stale Blob publication.');
assert.match(sql,/enable row level security/);
assert.match(sql,/private.is_aio_site_owner\(\)/);
assert.match(sql,/to anon,authenticated using \(true\)/);
assert.doesNotMatch(sql,/drop table/i);

const fakeSdk={handleUpload:async options=>{
 assert.equal(options.body.type,'vercel_blob.generate-client-token');
 const p={seriesId:'pokemon',seasonIndex:0,episodeNumber:1,sizeBytes:1024,accessToken:'valid-token'};
 const params=await options.onBeforeGenerateToken('watch/pokemon/0/1/123456-abc123.mp4',JSON.stringify(p));
 assert.equal(params.maximumSizeInBytes,1024*1024*1024);
 assert.equal(params.allowedContentTypes[0],'video/mp4');
 assert.equal(params.addRandomSuffix,true);
 assert.equal(JSON.parse(params.tokenPayload).userId,'owner-user');
 assert.ok(!params.tokenPayload.includes('valid-token'),'Never expose owner bearer tokens in Blob token payloads');
 await assert.rejects(()=>options.onBeforeGenerateToken('watch/bluey/0/1/123456-abc123.mp4',JSON.stringify(p)));
 await assert.rejects(()=>options.onBeforeGenerateToken('watch/pokemon/0/1/123456-abc123.mp4',JSON.stringify({...p,sizeBytes:1024**3+1})));
 await assert.rejects(()=>options.onBeforeGenerateToken('watch/pokemon/0/1/123456-abc123.mp4',JSON.stringify({...p,accessToken:'not-owner'})));
 return {type:'vercel_blob.client_token',token:'test-token'};
}};
let authorizationChecks=0;
const context={
 module:{exports:{}},
 require:name=>{assert.equal(name,'@vercel/blob/client');return fakeSdk},
 process:{env:{BLOB_READ_WRITE_TOKEN:'server-private-placeholder'}},
 URLSearchParams,AbortSignal,
 fetch:async(url,options)=>{
  assert.ok(options.headers.apikey);
  if(url.includes('/auth/v1/user')){
   assert.ok(['valid-token','not-owner'].includes(options.headers.Authorization.slice(7)));
   return {ok:true,json:async()=>({id:options.headers.Authorization.endsWith('valid-token')?'owner-user':'not-owner-user'})};
  }
  if(url.includes('/rest/v1/staff_roles')){
   authorizationChecks++;
   return {ok:true,json:async()=>url.includes('owner-user')&&!url.includes('not-owner-user')?[{role:'owner'}]:[]};
  }
  throw Error('Unexpected request '+url);
 }
};
vm.runInNewContext(api,context);
const handler=context.module.exports;
assert.equal(handler.MAX_SIZE,1073741824);
assert.throws(()=>handler.parsePayload('{}'));
assert.throws(()=>handler.parsePayload(JSON.stringify({seriesId:'pokemon',seasonIndex:0,episodeNumber:1,sizeBytes:1073741825,accessToken:'x'})));
function response(){
 return {headers:{},setHeader(k,v){this.headers[k]=v},end(str){this.data=JSON.parse(str)},statusCode:0};
}
(async()=>{
 const bad=response();await handler({method:'GET'},bad);
 assert.equal(bad.statusCode,405);
 const valid=response();await handler({method:'POST',body:{type:'vercel_blob.generate-client-token'}},valid);
 assert.equal(valid.statusCode,200);
 assert.ok(valid.data.token);
 assert.ok(authorizationChecks>=2);
 console.log('Watch Blob passed: exact 1 GiB limit, owner role, metadata isolation, B2 fallback and server-side token enforcement.');
})().catch(error=>{console.error(error);process.exitCode=1});
