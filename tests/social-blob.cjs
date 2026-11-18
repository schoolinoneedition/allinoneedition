'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const uploadCode=fs.readFileSync('api/social-blob-upload.js','utf8');
const deleteCode=fs.readFileSync('api/social-blob-delete.js','utf8');
const social=fs.readFileSync('social.html','utf8');
assert.match(social,/handleUploadUrl:'\/api\/social-blob-upload'/);
assert.match(social,/multipart:true/);
assert.match(social,/onUploadProgress/);
assert.match(social,/removeOwnSocialBlob\(media\.href/);
assert.match(social,/storage\.from\('social-media'\)\.remove/,'Old Supabase media delete support stays');
assert.doesNotMatch(social,/storage\.from\('social-media'\)\.upload/,'New files never go to Supabase Storage');
const UID='11111111-1111-4111-8111-111111111111';
const ALT='22222222-2222-4222-8222-222222222222';
const sdk={
  removed:[],
  handleUpload:async opts=>{
    const p={accessToken:'valid-access-token',sizeBytes:2048};
    const path='social/'+UID+'/abcdef12.mp4';
    const data=await opts.onBeforeGenerateToken(path,JSON.stringify(p));
    assert.equal(data.maximumSizeInBytes,100*1024*1024);
    assert.deepEqual(Array.from(data.allowedContentTypes),['video/mp4']);
    assert.equal(data.addRandomSuffix,true);
    assert.equal(JSON.parse(data.tokenPayload).userId,UID);
    assert.ok(!data.tokenPayload.includes('valid-access-token'));
    await assert.rejects(()=>opts.onBeforeGenerateToken('social/'+ALT+'/abcdef12.mp4',JSON.stringify(p)),/account folder/);
    await assert.rejects(()=>opts.onBeforeGenerateToken(path,JSON.stringify({...p,sizeBytes:104857601})),/100 MB/);
    await assert.rejects(()=>opts.onBeforeGenerateToken('social/'+UID+'/abcdef12.html',JSON.stringify(p)),/Unsupported/);
    await assert.rejects(()=>opts.onBeforeGenerateToken('social/'+UID+'/abcdef12.png',JSON.stringify({...p,sizeBytes:16*1024*1024})),/allowed size/);
    await assert.rejects(()=>opts.onBeforeGenerateToken(path,JSON.stringify({...p,accessToken:'invalid-token'})),/session/);
    return {type:'vercel_blob.client_token',token:'fake-token'};
  },
  del:async url=>{sdk.removed.push(url);}
};
const context={
  module:{exports:{}},
  require(name){assert.equal(name,'@vercel/blob/client');return sdk;},
  process:{env:{BLOB_READ_WRITE_TOKEN:'private-server-token'}},
  URL,AbortSignal,
  fetch:async(url,opts)=>{
    assert.ok(opts.headers.Authorization.startsWith('Bearer '));
    if(opts.headers.Authorization.endsWith('valid-access-token'))return {ok:true,status:200,json:async()=>({id:UID})};
    return {ok:false,status:401};
  }
};
vm.runInNewContext(uploadCode,context);
const upload=context.module.exports;
assert.throws(()=>upload.parsePayload('{}'),/Sign in/);
const delContext={
  module:{exports:{}},
  require(name){
    if(name==='@vercel/blob')return {del:sdk.del};
    if(name==='./social-blob-upload')return {verifyUser:upload.verifyUser,MIME_BY_EXT:upload.MIME_BY_EXT};
    throw Error('Unknown require '+name);
  },
  process:{env:{BLOB_READ_WRITE_TOKEN:'private-server-token'}},URL
};
vm.runInNewContext(deleteCode,delContext);
const delHandler=delContext.module.exports;
const base='https://abcdef.public.blob.vercel-storage.com/social/';
assert.ok(delHandler.ownBlob(base+UID+'/abcdef12-rand.mp4',UID));
assert.ok(!delHandler.ownBlob(base+ALT+'/abcdef12-rand.mp4',UID));
assert.ok(!delHandler.ownBlob('https://evil.example/social/'+UID+'/abcdef12-rand.mp4',UID));
assert.ok(!delHandler.ownBlob(base+UID+'/abcdef12.html',UID));
function response(){
  return {headers:{},setHeader(k,v){this.headers[k]=v},end(raw){this.data=JSON.parse(raw)},statusCode:0};
}
(async()=>{
  const wrong=response();await upload({method:'GET'},wrong);assert.equal(wrong.statusCode,405);
  const good=response();await upload({method:'POST',body:{type:'vercel_blob.generate-client-token'}},good);assert.equal(good.statusCode,200);
  const blocked=response();await delHandler({method:'POST',body:{accessToken:'valid-access-token',url:base+ALT+'/abcdef12.mp4'}},blocked);assert.equal(blocked.statusCode,403);
  const ok=response();await delHandler({method:'POST',body:{accessToken:'valid-access-token',url:base+UID+'/abcdef12.mp4'}},ok);assert.equal(ok.statusCode,200);
  assert.equal(sdk.removed.length,1);
  console.log('Social Blob tests passed: auth, size limits, owner paths, deletion, legacy compatibility.');
})().catch(err=>{console.error(err);process.exitCode=1});
