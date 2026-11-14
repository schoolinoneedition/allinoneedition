'use strict';

// Owner-authorised stream link only. This endpoint never starts/bills a VM,
// accepts arbitrary URLs, or stores passwords. Vagon dashboard controls
// streaming capacity, billing and whether an app may be streamed.
const SUPABASE_URL='https://btnbuchsrfllpzlypjtn.supabase.co';
const PUBLIC_SUPABASE_KEY='sb_publishable_a1gdNTiQdF9587p5K-Sw-Q_nFbvWRmp';
const VAGON_HOSTS=new Set(['app.vagon.io','streams.vagon.io']);

function validEmbedUrl(raw){
 try{
  const url=new URL(String(raw||''));
  if(url.protocol!=='https:'||url.port||url.username||url.password||url.search||url.hash)return null;
  if(!VAGON_HOSTS.has(url.hostname.toLowerCase()))return null;
  const accepted=url.hostname.toLowerCase()==='app.vagon.io'
   ? /^\/stream\/[a-z0-9_-]{8,128}\/?$/i.test(url.pathname)
   : /^\/streams\/[a-z0-9_-]{8,128}\/?$/i.test(url.pathname);
  return accepted?url.href:null;
 }catch{return null}
}
function output(res,body,status=200){
 res.statusCode=status;
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 res.end(JSON.stringify(body));
}
const disabled={state:'not_configured',message:'No approved in-site streaming host is connected.'};

module.exports=async function cloudStreamSession(req,res){
 if(req.method!=='GET'){
  res.setHeader('Allow','GET');
  return output(res,{state:'method_not_allowed'},405);
 }
 // Never expose a stream if the operator has not explicitly opted in.
 const configured=process.env.AIO_VAGON_EMBED_ENABLED==='true'
  &&typeof process.env.AIO_CLOUD_STREAM_OWNER_ID==='string'
  &&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(process.env.AIO_CLOUD_STREAM_OWNER_ID);
 const embedUrl=validEmbedUrl(process.env.AIO_VAGON_STREAM_EMBED_URL);
 if(!configured||!embedUrl)return output(res,disabled);
 const token=String(req.headers?.authorization||'').match(/^Bearer\s+([A-Za-z0-9_.-]{20,4096})$/i)?.[1];
 if(!token)return output(res,{state:'signin_required',message:'Sign into your All in One Edition owner account to open your stream.'},401);

 // Verify the JWT against Supabase itself, not decoded client-side claims.
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),3500);
 try{
  const reply=await fetch(SUPABASE_URL+'/auth/v1/user',{
   method:'GET',redirect:'error',cache:'no-store',
   headers:{apikey:process.env.AIO_SUPABASE_PUBLISHABLE_KEY||PUBLIC_SUPABASE_KEY,Authorization:'Bearer '+token},
   signal:controller.signal
  });
  if(!reply.ok)return output(res,{state:'signin_required',message:'Your account session has expired. Sign in again.'},401);
  const user=await reply.json();
  if(!user||user.id!==process.env.AIO_CLOUD_STREAM_OWNER_ID){
   return output(res,{state:'not_authorised',message:'This private stream is available only to the site owner.'},403);
  }
  return output(res,{
   state:'ready',
   provider:'Vagon Streams',
   embedUrl,
   message:'Private stream configured. Starting it may incur provider charges. Game availability is not verified.'
  });
 }catch{
  return output(res,{state:'auth_unavailable',message:'The account service is unavailable. Please retry.'},503);
 }finally{clearTimeout(timeout)}
};
module.exports.validEmbedUrl=validEmbedUrl;
