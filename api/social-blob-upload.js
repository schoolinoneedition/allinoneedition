'use strict';
/* Authenticated Social uploads go browser -> Vercel Blob; no private Blob key reaches the browser. */
const {handleUpload}=require('@vercel/blob/client');
const SUPABASE_URL='https://btnbuchsrfllpzlypjtn.supabase.co';
const SUPABASE_KEY='sb_publishable_a1gdNTiQdF9587p5K-Sw-Q_nFbvWRmp';
const IMAGE_LIMIT=15*1024*1024, VIDEO_LIMIT=100*1024*1024;
const MIME_BY_EXT=Object.freeze({
  jpg:['image/jpeg'],jpeg:['image/jpeg'],png:['image/png'],webp:['image/webp'],gif:['image/gif'],
  mp4:['video/mp4'],m4v:['video/mp4','video/x-m4v'],webm:['video/webm'],
  ogv:['video/ogg'],ogg:['video/ogg'],mov:['video/quicktime'],'3gp':['video/3gpp'],
  mkv:['video/x-matroska'],avi:['video/x-msvideo'],wmv:['video/x-ms-wmv'],
  flv:['video/x-flv'],mpeg:['video/mpeg'],mpg:['video/mpeg'],
  ts:['video/mp2t'],mts:['video/mp2t'],m2ts:['video/mp2t'],m2v:['video/mpeg'],
  h264:['video/h264'],'264':['video/h264'],hevc:['video/hevc'],h265:['video/hevc'],
  av1:['video/av1'],ivf:['video/ivf']
});
const PATH=/^social\/([0-9a-f]{8}-[0-9a-f-]{27,36})\/([a-z0-9-]{6,90})\.([a-z0-9]{2,8})$/i;
function reply(res,status,payload){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(payload));
}
function parsePayload(raw){
  if(typeof raw!=='string'||raw.length>4000)throw Error('Invalid Social upload request.');
  let data;try{data=JSON.parse(raw)}catch{throw Error('Invalid Social upload request.')}
  if(!data||typeof data.accessToken!=='string'||data.accessToken.length<10||data.accessToken.length>3000)throw Error('Sign in to upload media.');
  if(!Number.isSafeInteger(data.sizeBytes)||data.sizeBytes<1||data.sizeBytes>VIDEO_LIMIT)throw Error('Files must be 100 MB or smaller.');
  return data;
}
async function verifyUser(token){
  const response=await fetch(SUPABASE_URL+'/auth/v1/user',{
    headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+token,Accept:'application/json'},
    signal:AbortSignal.timeout(10000),cache:'no-store'
  });
  if(response.status===402)throw Error('Supabase authentication restricted (HTTP 402). Check project usage and billing.');
  if(!response.ok)throw Error('Your session expired. Sign in again.');
  const user=await response.json();
  if(typeof user?.id!=='string'||!user.id)throw Error('Sign in to upload media.');
  return user.id;
}
module.exports=async function socialBlobUpload(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,{error:'POST required.'})}
  if(!process.env.BLOB_READ_WRITE_TOKEN)return reply(res,503,{error:'Vercel Blob is not connected to this deployment.'});
  try{
    const response=await handleUpload({
      request:req,body:req.body,
      onBeforeGenerateToken:async(pathname,clientPayload)=>{
        const data=parsePayload(clientPayload);
        const match=PATH.exec(String(pathname||''));
        if(!match)throw Error('Invalid Social storage path.');
        const extension=match[3].toLowerCase(),allowed=MIME_BY_EXT[extension];
        if(!allowed)throw Error('Unsupported media type.');
        const maximumSizeInBytes=allowed[0].startsWith('image/')?IMAGE_LIMIT:VIDEO_LIMIT;
        if(data.sizeBytes>maximumSizeInBytes)throw Error('File exceeds the allowed size.');
        const userId=await verifyUser(data.accessToken);
        if(match[1]!==userId)throw Error('You can upload only to your own account folder.');
        return {
          allowedContentTypes:allowed,maximumSizeInBytes,addRandomSuffix:true,
          tokenPayload:JSON.stringify({userId,kind:'social'})
        };
      },
      onUploadCompleted:async()=>{/* The Social post is published by Supabase RLS after upload. */}
    });
    return reply(res,200,response);
  }catch(error){
    const msg=String(error?.message||'Upload failed.').slice(0,220);
    return reply(res,msg.includes('HTTP 402')?503:/session|sign in|account folder/i.test(msg)?403:400,{error:msg});
  }
};
module.exports.parsePayload=parsePayload;
module.exports.verifyUser=verifyUser;
module.exports.MIME_BY_EXT=MIME_BY_EXT;
