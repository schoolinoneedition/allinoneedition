/* All in One Edition: background Social video cache warmer.
   Only public MP4s in this project's own Supabase social-media bucket are eligible. */
'use strict';
const AIO_MEDIA_ORIGIN='https://btnbuchsrfllpzlypjtn.supabase.co';
const AIO_MEDIA_PATH='/storage/v1/object/public/social-media/';
const AIO_MAX_FILE_BYTES=36*1024*1024;
const AIO_DEFAULT_BATCH_BYTES=70*1024*1024;
const aioSeenMedia=new Set();

function aioAllowedMediaUrl(value){
  try{
    const url=new URL(String(value||''));
    return url.protocol==='https:'&&url.origin===AIO_MEDIA_ORIGIN&&url.pathname.startsWith(AIO_MEDIA_PATH)?url.href:'';
  }catch{return ''}
}

self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('message',event=>{
  const data=event.data||{};
  if(data.type!=='AIO_PREFETCH_SOCIAL_VIDEOS')return;
  const urls=[...new Set((Array.isArray(data.urls)?data.urls:[]).map(aioAllowedMediaUrl).filter(Boolean))].slice(0,5);
  const source=event.source;
  event.waitUntil((async()=>{
    let downloadedBytes=0,warmed=0,skipped=0;
    const batchLimit=Math.min(AIO_DEFAULT_BATCH_BYTES,Math.max(1,Number(data.batchLimitBytes)||AIO_DEFAULT_BATCH_BYTES));
    for(const url of urls){
      if(aioSeenMedia.has(url)){skipped++;continue;}
      try{
        let expectedBytes=0;
        try{
          const head=await fetch(url,{method:'HEAD',mode:'cors',credentials:'omit',cache:'force-cache'});
          if(head.ok)expectedBytes=Number(head.headers.get('content-length')||0);
        }catch{}
        if(expectedBytes>AIO_MAX_FILE_BYTES||expectedBytes>batchLimit-downloadedBytes){
          aioSeenMedia.add(url);skipped++;continue;
        }
        const response=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',cache:'force-cache'});
        if(!response.ok){skipped++;continue;}
        const declaredBytes=Number(response.headers.get('content-length')||expectedBytes||0);
        if(declaredBytes>AIO_MAX_FILE_BYTES||declaredBytes>batchLimit-downloadedBytes){
          try{await response.body?.cancel()}catch{}
          aioSeenMedia.add(url);skipped++;continue;
        }
        let actualBytes=0,complete=true;
        if(response.body?.getReader){
          const reader=response.body.getReader();
          while(true){
            const part=await reader.read();
            if(part.done)break;
            actualBytes+=part.value?.byteLength||0;
            if(actualBytes>AIO_MAX_FILE_BYTES||actualBytes>batchLimit-downloadedBytes){
              complete=false;
              try{await reader.cancel()}catch{}
              break;
            }
          }
        }else{
          const blob=await response.blob();
          actualBytes=blob.size;
          if(actualBytes>AIO_MAX_FILE_BYTES||actualBytes>batchLimit-downloadedBytes)complete=false;
        }
        if(!complete){aioSeenMedia.add(url);skipped++;continue;}
        downloadedBytes+=actualBytes||declaredBytes;
        warmed++;
        aioSeenMedia.add(url);
      }catch(error){
        skipped++;
      }
    }
    try{source?.postMessage({type:'AIO_PREFETCH_SOCIAL_DONE',downloadedBytes,warmed,skipped})}catch{}
  })());
});
