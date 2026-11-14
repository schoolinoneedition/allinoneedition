'use strict';
const assert=require('node:assert/strict');
const handler=require('../api/cloud-host-status.js');
const original=process.env.AIO_GPU_HOST_HEALTH_URL;
const originalFetch=global.fetch;
function mockResponse(){
 const headers={};let result;
 return {
  setHeader:(k,v)=>{headers[k]=v},
  end:v=>{result=JSON.parse(v)},
  get body(){return result},
  get headers(){return headers},
  statusCode:200
 };
}
async function run(method='GET'){
 const response=mockResponse();
 await handler({method},response);
 return response;
}
async function tests(){
 try{
  delete process.env.AIO_GPU_HOST_HEALTH_URL;
  let r=await run();
  assert.equal(r.body.state,'not_configured');
  assert.equal(r.body.sessionAvailable,false);
  assert.equal(r.body.fortniteVerified,false);
  assert.equal(r.body.robloxVerified,false);
  assert.match(r.headers['Cache-Control'],/no-store/);
  process.env.AIO_GPU_HOST_HEALTH_URL='http://localhost:8080/health';
  r=await run();
  assert.equal(r.body.state,'invalid_config');
  assert.equal(handler.validHealthUrl('https://127.0.0.1/health'),null);
  assert.equal(handler.validHealthUrl('https://gpu.local/health'),null);
  assert.equal(handler.validHealthUrl('https://u:p@gpu.example.net/health'),null);
  assert.equal(handler.validHealthUrl('http://gpu.example.net/health'),null);
  assert.ok(handler.validHealthUrl('https://gpu.example.net/health'));
  process.env.AIO_GPU_HOST_HEALTH_URL='https://gpu.example.net/health';
  let requested='';
  global.fetch=async(url,opts)=>{
   requested=url;
   assert.equal(opts.redirect,'error');
   assert.equal(opts.method,'GET');
   return {ok:true,text:async()=>JSON.stringify({service:'aio-game-host',gpuReady:true,sessionGatewayReady:true})};
  };
  r=await run();
  assert.equal(requested,'https://gpu.example.net/health');
  assert.equal(r.body.state,'host_online');
  assert.equal(r.body.gpuDetected,true);
  assert.equal(r.body.streamGatewayDetected,true);
  assert.equal(r.body.sessionAvailable,false,'Health endpoint cannot grant player sessions');
  assert.equal(r.body.fortniteVerified,false,'GPU health does not prove Fortnite compatibility');
  r=await run('POST');
  assert.equal(r.statusCode,405);
  assert.equal(r.body.state,'method_not_allowed');
  global.fetch=async()=>({ok:true,text:async()=>JSON.stringify({service:'random-gateway',gpuReady:true})});
  r=await run();
  assert.equal(r.body.state,'unverified_host');
  global.fetch=async()=>{throw Error('private connection detail must not be exposed')};
  r=await run();
  assert.equal(r.body.state,'host_unreachable');
  assert.doesNotMatch(JSON.stringify(r.body),/private connection detail/);
  console.log('GPU host status passed: no host, safe URL, approved health, no false sessions, timeout errors and no leaked host details.');
 }finally{
  if(original===undefined)delete process.env.AIO_GPU_HOST_HEALTH_URL;
  else process.env.AIO_GPU_HOST_HEALTH_URL=original;
  global.fetch=originalFetch;
 }
}
tests().catch(err=>{console.error(err);process.exitCode=1});
