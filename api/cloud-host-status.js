'use strict';

/*
 * Dedicated GPU host preflight for All in One Edition.
 * This is NOT a stream proxy and never grants a remote-desktop session.
 * Health URL is configured server-side only; no browser-supplied URLs.
 */
const PRIVATE_HOST=/^(localhost|.+\.localhost|.+\.local|.+\.internal)$/i;
function validHealthUrl(raw){
  try{
    const url=new URL(String(raw||''));
    const host=url.hostname.replace(/^\[|\]$/g,'').toLowerCase();
    if(url.protocol!=='https:'||!host||url.username||url.password||url.hash||!url.pathname.startsWith('/'))return null;
    if(PRIVATE_HOST.test(host)||host.includes(':')||/^[0-9.]+$/.test(host))return null;
    return url;
  }catch{return null}
}
function send(res,body,code=200){
  res.statusCode=code;
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(body));
}
const base={
  renderProvidesGpu:false,
  sessionAvailable:false,
  fortniteVerified:false,
  robloxVerified:false
};
module.exports=async function cloudHostStatus(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return send(res,{...base,state:'method_not_allowed'},405);
  }
  const raw=process.env.AIO_GPU_HOST_HEALTH_URL;
  if(!raw)return send(res,{...base,state:'not_configured',message:'No dedicated GPU host is connected.'});
  const url=validHealthUrl(raw);
  if(!url)return send(res,{...base,state:'invalid_config',message:'GPU host health check is not configured safely.'});
  let controller;
  try{
    controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),3500);
    try{
      const reply=await fetch(url.toString(),{
        method:'GET',
        redirect:'error',
        cache:'no-store',
        headers:{Accept:'application/json'},
        signal:controller.signal
      });
      if(!reply.ok)return send(res,{...base,state:'host_unreachable',message:'GPU host did not return a successful health response.'});
      const body=await reply.text();
      if(body.length>1024)return send(res,{...base,state:'unverified_host',message:'The host health response is not valid.'});
      let health;
      try{health=JSON.parse(body)}catch{return send(res,{...base,state:'unverified_host',message:'The host did not provide a valid health report.'})}
      if(health?.service!=='aio-game-host'){
        return send(res,{...base,state:'unverified_host',message:'This endpoint is not an approved AIO GPU host.'});
      }
      return send(res,{
        ...base,
        state:'host_online',
        gpuDetected:health.gpuReady===true,
        streamGatewayDetected:health.sessionGatewayReady===true,
        message:health.gpuReady===true?'A dedicated GPU host responded. Secure game sessions are not connected yet.':'Host responded, but no working GPU was reported.'
      });
    }finally{clearTimeout(timer)}
  }catch{
    return send(res,{...base,state:'host_unreachable',message:'GPU host is offline or its connection timed out.'});
  }finally{controller?.abort()}
};
module.exports.validHealthUrl=validHealthUrl;
