'use strict';
const assert=require('node:assert/strict');
const handler=require('../api/cloud-stream-session.js');
const oldEnv={
 AIO_VAGON_EMBED_ENABLED:process.env.AIO_VAGON_EMBED_ENABLED,
 AIO_CLOUD_STREAM_OWNER_ID:process.env.AIO_CLOUD_STREAM_OWNER_ID,
 AIO_VAGON_STREAM_EMBED_URL:process.env.AIO_VAGON_STREAM_EMBED_URL
};
const oldFetch=global.fetch;
const OWNER='123e4567-e89b-42d3-a456-426614174000';
const url='https://app.vagon.io/stream/abcDEFgh1234';
function mock(){
 let body=null,headers={};
 return {setHeader:(k,v)=>headers[k]=v,end:b=>{body=JSON.parse(b)},get body(){return body},get headers(){return headers},statusCode:200};
}
async function invoke(auth,method='GET'){
 const res=mock();
 await handler({method,headers:auth?{authorization:'Bearer '+auth}:{}},res);
 return res;
}
async function main(){
 try{
  delete process.env.AIO_VAGON_EMBED_ENABLED;
  delete process.env.AIO_CLOUD_STREAM_OWNER_ID;
  delete process.env.AIO_VAGON_STREAM_EMBED_URL;
  let res=await invoke();
  assert.equal(res.body.state,'not_configured');
  assert.equal(res.body.embedUrl,undefined);
  assert.match(res.headers['Cache-Control'],/no-store/);
  assert.equal(handler.validEmbedUrl(url),url);
  assert.equal(handler.validEmbedUrl('https://streams.vagon.io/streams/example1234'),'https://streams.vagon.io/streams/example1234');
  for(const invalid of [
   'https://evil.example/stream/abcDEFgh1234',
   'https://app.vagon.io.evil.example/stream/abcDEFgh1234',
   'https://app.vagon.io/stream/abcDEFgh1234?launchFlags=-token%20hello',
   'https://app.vagon.io/stream/abcDEFgh1234#test',
   'https://alice:pass@app.vagon.io/stream/abcDEFgh1234',
   'https://app.vagon.io/admin',
   'http://app.vagon.io/stream/abcDEFgh1234',
   'https://127.0.0.1/stream/abcDEFgh1234'
  ])assert.equal(handler.validEmbedUrl(invalid),null,'Reject unsupported or credential-bearing Vagon URL: '+invalid);
  process.env.AIO_VAGON_EMBED_ENABLED='true';
  process.env.AIO_CLOUD_STREAM_OWNER_ID=OWNER;
  process.env.AIO_VAGON_STREAM_EMBED_URL=url;
  res=await invoke();
  assert.equal(res.statusCode,401);
  assert.equal(res.body.state,'signin_required');
  assert.equal(res.body.embedUrl,undefined);
  let authHeader='';
  global.fetch=async(uri,options)=>{
   assert.equal(uri,'https://btnbuchsrfllpzlypjtn.supabase.co/auth/v1/user');
   authHeader=options.headers.Authorization;
   assert.equal(options.redirect,'error');
   return {ok:true,json:async()=>({id:OWNER})};
  };
  res=await invoke('a'.repeat(40));
  assert.equal(authHeader,'Bearer '+'a'.repeat(40));
  assert.equal(res.body.state,'ready');
  assert.equal(res.body.embedUrl,url);
  assert.equal(res.body.provider,'Vagon Streams');
  res=await invoke('a'.repeat(40),'POST');
  assert.equal(res.statusCode,405);
  assert.equal(res.body.embedUrl,undefined);
  global.fetch=async()=>({ok:true,json:async()=>({id:'123e4567-e89b-42d3-a456-426614174001'})});
  res=await invoke('a'.repeat(40));
  assert.equal(res.statusCode,403);
  assert.equal(res.body.embedUrl,undefined);
  global.fetch=async()=>({ok:false});
  res=await invoke('a'.repeat(40));
  assert.equal(res.statusCode,401);
  global.fetch=async()=>{throw new Error('Secret host error that must stay private')};
  res=await invoke('a'.repeat(40));
  assert.equal(res.statusCode,503);
  assert.doesNotMatch(JSON.stringify(res.body),/Secret host error/);
  console.log('Private stream gate passed: disabled default, provider URL allowlist, owner-only auth, and no token leakage.');
 }finally{
  for(const [k,v] of Object.entries(oldEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v}
  global.fetch=oldFetch;
 }
}
main().catch(err=>{console.error(err);process.exitCode=1});
