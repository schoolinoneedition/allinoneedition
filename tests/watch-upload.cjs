'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('anime.html','utf8');
function functionSource(name,next){const a=html.indexOf(' async function '+name+'('),b=html.indexOf(' async function '+next+'(',a+1);assert.ok(a>=0&&b>a);return html.slice(a,b)}
const makeElement=()=>({value:'',textContent:'',disabled:false,hidden:false,files:[],href:''});
const elements=new Map(['episodeVideoFile','ownerLinkStatus','uploadEpisodeVideo','episodeUploadProgress','episodeWatchUrl','hostedVideoUrl','openHostedVideoUrl','hostedVideoResult','episodeUploadMeta'].map(id=>[id,makeElement()]));
const mb=1024*1024,oneGB=1024*mb;
let savedRow=null,capturedTarget=null,partCalls=0,initPayload=null;
const target={seriesId:'pokemon',seasonIndex:0,episodeNumber:4},other={seriesId:'bluey',seasonIndex:1,episodeNumber:2};
const ctx={console,Date,Math,Number,Promise,encodeURIComponent,Map,setTimeout:fn=>{fn();return 1},
 $:id=>elements.get(id),selectedEpisode:{...target},currentSession:{user:{id:'owner'},access_token:'session'},siteOwner:true,episodeUploadActive:false,
 B2_MEDIA_API:'https://media.example',episodeLinks:new Map(),watchLinkKey:(id,season,ep)=>[id,season,ep].join(':'),
 ownerClient:{from:()=>({upsert:async row=>{savedRow=row;return{error:null}}}),auth:{getSession:async()=>({data:{session:{access_token:'fresh'}}})}},
 renderCatalog(){},renderPlayer(){throw Error('A different episode should not be replaced')},series:[],videoObjectPath:()=>null,deleteB2Media:async()=>{},
 fetch:async(url,options)=>{if(url.endsWith('/uploads/initiate')){initPayload=JSON.parse(options.body);return{ok:true,json:async()=>({uploadId:'test-id',partSizeBytes:32*mb})}}if(url.includes('/parts/')){partCalls++;ctx.selectedEpisode={...other};if(partCalls===1)return{ok:false,status:503,json:async()=>({error:'Temporary failure'})};return{ok:true,json:async()=>({etag:'part-'+partCalls})}}if(url.endsWith('/complete'))return{ok:true,json:async()=>({})};throw Error('Unexpected request '+url)}
};
vm.createContext(ctx);vm.runInContext(functionSource('saveEpisodeVideoRow','saveOwnerEpisodeLink'),ctx);
(async()=>{
 ctx.selectedEpisode={...other};await ctx.saveEpisodeVideoRow('B2 Storage','https://media.example/media/test-id',target);
 assert.equal(savedRow.series_id,'pokemon');assert.equal(savedRow.season_index,0);assert.equal(savedRow.episode_number,4);assert.equal(savedRow.updated_by,'owner');
 ctx.saveEpisodeVideoRow=async(_provider,_url,captured)=>{capturedTarget=captured};ctx.selectedEpisode={...target};
 vm.runInContext(functionSource('uploadOwnerEpisodeVideo','removeOwnerEpisodeLink'),ctx);
 const file={name:'episode.mp4',type:'',size:oneGB,slice:(a,b)=>({size:b-a})};elements.get('episodeVideoFile').files=[file];
 await ctx.uploadOwnerEpisodeVideo();assert.equal(initPayload.sizeBytes,oneGB);assert.equal(initPayload.contentType,'video/mp4');assert.equal(partCalls,33);assert.equal(capturedTarget.seriesId,'pokemon');assert.equal(capturedTarget.episodeNumber,4);
 file.size=oneGB+1;partCalls=0;await ctx.uploadOwnerEpisodeVideo();assert.match(elements.get('ownerLinkStatus').textContent,/1 GB/);assert.equal(partCalls,0);
 console.log('Watch upload passed: correct episode columns, 1 GB in chunks, retry, session refresh, target locking and size rejection.');
})().catch(error=>{console.error(error);process.exitCode=1});
