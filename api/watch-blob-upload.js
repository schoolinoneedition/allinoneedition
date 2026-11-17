'use strict';
/*
 * Owner-authenticated Vercel Blob upload token endpoint.
 * Upload bytes go directly from the browser to Vercel Blob, not through this
 * function (whose body limit is far below the 1 GiB Watch limit).
 */
const { handleUpload } = require('@vercel/blob/client');
const SUPABASE_URL = 'https://btnbuchsrfllpzlypjtn.supabase.co';
const SUPABASE_ANON = 'sb_publishable_a1gdNTiQdF9587p5K-Sw-Q_nFbvWRmp';
const MAX_SIZE = 1024 * 1024 * 1024;
const SERIES = new Set(['pokemon','quint','dressup','demon','haikyu','drstone','spyfamily','frieren','myhero','bluelock','pokemon-tv-official','bluey','pocoyo','bing']);
const FILE_PATH = /^watch\/([a-z0-9-]+)\/(\d{1,2})\/(\d{1,4})\/[a-z0-9-]{6,90}\.(mp4|webm)$/;
function reply(res,status,data){
  res.statusCode=status;
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(data));
}
function parsePayload(raw){
  if(typeof raw!=='string'||raw.length>4096)throw Error('Invalid upload request.');
  let p;
  try{p=JSON.parse(raw)}catch{throw Error('Invalid upload request.')}
  if(!p||typeof p!=='object'||typeof p.accessToken!=='string'||p.accessToken.length>3000||!p.accessToken)throw Error('Sign in with the owner account.');
  if(!SERIES.has(p.seriesId)||!Number.isInteger(p.seasonIndex)||p.seasonIndex<0||p.seasonIndex>49||!Number.isInteger(p.episodeNumber)||p.episodeNumber<1||p.episodeNumber>5000)throw Error('Select a valid Watch episode.');
  if(!Number.isSafeInteger(p.sizeBytes)||p.sizeBytes<1||p.sizeBytes>MAX_SIZE)throw Error('Videos must be 1 GiB or smaller.');
  return p;
}
async function verifyOwner(token){
  const headers={apikey:SUPABASE_ANON,Authorization:'Bearer '+token,Accept:'application/json'};
  const userResponse=await fetch(SUPABASE_URL+'/auth/v1/user',{headers,signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!userResponse.ok)throw Error('Your session expired. Sign in again.');
  const user=await userResponse.json();
  if(!user?.id||typeof user.id!=='string')throw Error('Valid account required.');
  const qs=new URLSearchParams({select:'role',user_id:'eq.'+user.id});
  const roles=await fetch(SUPABASE_URL+'/rest/v1/staff_roles?'+qs,{headers,signal:AbortSignal.timeout(10000),cache:'no-store'});
  if(!roles.ok)throw Error('Owner access could not be verified.');
  const data=await roles.json();
  if(!Array.isArray(data)||!data.some(row=>row.role==='owner'))throw Error('Only a verified site owner may upload Watch videos.');
  return user.id;
}
module.exports=async function watchBlobUpload(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,{error:'POST required.'})}
  if(!process.env.BLOB_READ_WRITE_TOKEN)return reply(res,503,{error:'Vercel Blob is not connected to this deployment.'});
  try{
    const response=await handleUpload({
      request:req,
      body:req.body,
      onBeforeGenerateToken:async(pathname,clientPayload)=>{
        const p=parsePayload(clientPayload);
        const match=FILE_PATH.exec(String(pathname||''));
        if(!match||match[1]!==p.seriesId||Number(match[2])!==p.seasonIndex||Number(match[3])!==p.episodeNumber)throw Error('The upload path does not match the selected episode.');
        const userId=await verifyOwner(p.accessToken);
        return {
          allowedContentTypes:[match[5]==='mp4'?'video/mp4':'video/webm'],
          maximumSizeInBytes:MAX_SIZE,
          addRandomSuffix:true,
          tokenPayload:JSON.stringify({userId,seriesId:p.seriesId,seasonIndex:p.seasonIndex,episodeNumber:p.episodeNumber})
        };
      },
      onUploadCompleted:async()=>{ /* Publishing is an explicit owner-only Supabase write after upload. */ }
    });
    return reply(res,200,response);
  }catch(error){
    const message=String(error?.message||'Upload request failed.').slice(0,200);
    const status=/owner|session|sign in|account|required/i.test(message)?403:400;
    return reply(res,status,{error:message});
  }
};
module.exports.parsePayload=parsePayload;
module.exports.verifyOwner=verifyOwner;
module.exports.MAX_SIZE=MAX_SIZE;
