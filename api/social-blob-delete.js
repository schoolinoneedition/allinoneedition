'use strict';
const {del}=require('@vercel/blob');
const {verifyUser,MIME_BY_EXT}=require('./social-blob-upload');
function reply(res,status,payload){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(payload));
}
function ownBlob(raw,userId){
  try{
    const url=new URL(raw);
    const match=/^\/social\/([^/]+)\/([a-z0-9-]{6,120})\.([a-z0-9]{2,8})$/i.exec(url.pathname);
    return url.protocol==='https:'&&
      /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i.test(url.hostname)&&
      !url.search&&!url.hash&&match&&match[1]===userId&&
      Object.hasOwn(MIME_BY_EXT,match[3].toLowerCase());
  }catch{return false;}
}
module.exports=async function socialBlobDelete(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,{error:'POST required.'})}
  if(!process.env.BLOB_READ_WRITE_TOKEN)return reply(res,503,{error:'Vercel Blob is not connected.'});
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!body||typeof body.accessToken!=='string'||body.accessToken.length<10||body.accessToken.length>3000||
       typeof body.url!=='string'||body.url.length>2048)throw Error('A valid session and media URL are required.');
    const userId=await verifyUser(body.accessToken);
    if(!ownBlob(body.url,userId))return reply(res,403,{error:'You may remove only your own Social uploads.'});
    await del(body.url);
    return reply(res,200,{ok:true});
  }catch(error){
    const msg=String(error?.message||'Media deletion unavailable.').slice(0,200);
    return reply(res,msg.includes('HTTP 402')?503:/session|sign in/i.test(msg)?403:400,{error:msg});
  }
};
module.exports.ownBlob=ownBlob;
