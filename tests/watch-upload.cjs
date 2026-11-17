'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('anime.html','utf8');
function functionSource(name,next){
 const a=html.indexOf(' async function '+name+'('),b=html.indexOf(' async function '+next+'(',a+1);
 assert.ok(a>=0&&b>a,'Could not extract '+name);return html.slice(a,b);
}
const makeElement=()=>({value:'',textContent:'',disabled:false,hidden:false,files:[],href:'',max:0});
const elements=new Map(['episodeVideoFile','ownerLinkStatus','uploadEpisodeVideo','episodeUploadProgress','episodeWatchUrl','hostedVideoUrl','openHostedVideoUrl','hostedVideoResult','episodeUploadMeta'].map(id=>[id,makeElement()]));
const mb=1024*1024,oneGB=1024*mb;
let savedRow=null,capturedTarget=null,partCalls=0,initPayload=null,successfulParts=0;
const target={seriesId:'pokemon',seasonIndex:0,episodeNumber:4},other={seriesId:'bluey',seasonIndex:1,episodeNumber:2};
const ctx={
 console,Date,Math,Number,Promise,encodeURIComponent,Map,setTimeout:fn=>{fn();return 1},
 $:id=>elements.get(id),selectedEpisode:{...target},currentSession:{user:{id:'owner'},access_token:'session'},siteOwner:true,episodeUploadActive:false,
 B2_MEDIA_API:'https://media.example',episodeLinks:new Map(),watchLinkKey:(id,season,ep)=>[id,season,ep].join(':'),
 ownerClient:{from:()=>({upsert:async row=>{savedRow=row;return{error:null}}}),auth:{getSession:async()=>({data:{session:{access_token:'fresh'}}})}},
 renderCatalog(){},renderPlayer(){throw Error('An unrelated episode should not be replaced')},series:[],videoObjectPath:()=>null,deleteB2Media:async()=>{},getB2PlaybackUrl:async url=>url,
 rememberPendingTransfer(){},updateTransferRecovery(){},rememberPendingHostedVideo(){},updateHostedSaveButton(){},clearPendingHostedVideo(){},clearPendingTransfer(){},refreshHostedOpenLink(){},
 watchTransferStatus:async()=>({status:'ready'}),
 fetch:async(url,options)=>{
  if(url.endsWith('/uploads/initiate')){
   initPayload=JSON.parse(options.body);
   return {ok:true,json:async()=>({uploadId:'test-id',partSizeBytes:32*mb})};
  }
  if(url.includes('/parts/')){
   partCalls++;
   assert.ok(options.body.size<=8*mb,'No part may exceed worker advertised maximum');
   assert.equal(options.headers['X-Part-Size'],String(options.body.size));
   ctx.selectedEpisode={...other};
   if(partCalls===1)return {ok:false,status:503,json:async()=>({error:'Temporary failure'})};
   successfulParts++;
   return {ok:true,status:200,json:async()=>({etag:'part-'+successfulParts})};
  }
  if(url.endsWith('/complete')){
   const data=JSON.parse(options.body);
   assert.equal(data.parts.length,128,'A 1 GiB MP4 uses 128 mobile-friendly 8 MiB parts');
   return {ok:true,json:async()=>({status:'ready'})};
  }
  throw Error('Unexpected request '+url);
 }
};
vm.createContext(ctx);
vm.runInContext(functionSource('saveEpisodeVideoRow','saveOwnerEpisodeLink'),ctx);
(async()=>{
 ctx.selectedEpisode={...other};
 await ctx.saveEpisodeVideoRow('B2 Storage','https://media.example/media/test-id',target);
 assert.equal(savedRow.series_id,'pokemon');
 assert.equal(savedRow.season_index,0);
 assert.equal(savedRow.episode_number,4);
 assert.equal(savedRow.updated_by,'owner');

 ctx.saveEpisodeVideoRow=async(_provider,_url,captured)=>{capturedTarget=captured};
 ctx.selectedEpisode={...target};
 vm.runInContext(functionSource('uploadOwnerEpisodeVideo','removeOwnerEpisodeLink'),ctx);

 const file={
  name:'episode.mp4',type:'',size:oneGB,
  slice:(from,to)=>({
   size:to-from,
   arrayBuffer:async()=>{
    const bytes=new Uint8Array(16);
    bytes.set([0,0,0,16,0x66,0x74,0x79,0x70],0);
    return bytes.buffer;
   }
  })
 };
 elements.get('episodeVideoFile').files=[file];
 await ctx.uploadOwnerEpisodeVideo();
 assert.equal(initPayload.sizeBytes,oneGB);
 assert.equal(initPayload.contentType,'video/mp4');
 assert.equal(partCalls,129,'128 successful parts plus one transient 503 retry');
 assert.equal(successfulParts,128);
 assert.equal(capturedTarget.seriesId,'pokemon','Upload must stay bound to the original episode.');
 assert.equal(capturedTarget.episodeNumber,4);
 assert.equal(elements.get('episodeUploadProgress').value,oneGB);
 assert.match(elements.get('ownerLinkStatus').textContent,/Uploaded to B2/);
 assert.equal(ctx.episodeUploadActive,false);

 file.size=oneGB+1;partCalls=0;
 await ctx.uploadOwnerEpisodeVideo();
 assert.match(elements.get('ownerLinkStatus').textContent,/1 GB/);
 assert.equal(partCalls,0);
 console.log('Watch upload passed: correct episode columns, 1 GiB in 128 mobile-safe B2 chunks, 503 retry, fresh sessions, episode target lock and size rejection.');
})().catch(error=>{console.error(error);process.exitCode=1});
