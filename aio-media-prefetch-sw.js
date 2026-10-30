/* All in One Edition: cache-backed background Social video warm-up.
   Only public MP4 objects in this site's own Supabase social-media bucket are eligible. */
'use strict';

const AIO_MEDIA_ORIGIN='https://btnbuchsrfllpzlypjtn.supabase.co';
const AIO_MEDIA_PREFIX='/storage/v1/object/public/social-media/';
const AIO_CACHE_NAME='aio-social-video-cache-v2';
const AIO_MAX_FILE_BYTES=32*1024*1024;
const AIO_MAX_CACHE_BYTES=160*1024*1024;

function aioSafeMediaUrl(value){
  try{
    const url=new URL(String(value||''));
    return url.protocol==='https:'&&url.origin===AIO_MEDIA_ORIGIN&&
      url.pathname.startsWith(AIO_MEDIA_PREFIX)&&/\.mp4$/i.test(url.pathname)?url.href:'';
  }catch{return ''}
}

async function aioCacheSize(cache){
  let total=0;
  for(const request of await cache.keys()){
    const response=await cache.match(request);
    total+=Math.max(0,Number(response?.headers.get('x-aio-cached-bytes'))||0);
  }
  return total;
}

async function aioPruneCache(cache,neededBytes,limitBytes){
  let total=await aioCacheSize(cache);
  if(total+neededBytes<=limitBytes)return total;
  // Cache.keys() preserves insertion order, so evict the oldest warmed media first.
  for(const request of await cache.keys()){
    if(total+neededBytes<=limitBytes)break;
    const response=await cache.match(request);
    const size=Math.max(0,Number(response?.headers.get('x-aio-cached-bytes'))||0);
    await cache.delete(request);
    total=Math.max(0,total-size);
  }
  return total;
}

async function aioStoreMedia(cache,url,response,maxFileBytes,remainingBytes,limitBytes){
  if(!response?.ok||response.type==='opaque')return 0;
  const declared=Number(response.headers.get('content-length')||0);
  if(declared>maxFileBytes||declared>remainingBytes){
    try{await response.body?.cancel()}catch{}
    return 0;
  }
  const blob=await response.blob();
  if(!blob.size||blob.size>maxFileBytes||blob.size>remainingBytes)return 0;
  await aioPruneCache(cache,blob.size,limitBytes);
  if(await aioCacheSize(cache)+blob.size>limitBytes)return 0;

  const headers=new Headers(response.headers);
  headers.delete('content-range');
  headers.delete('content-encoding');
  headers.set('content-length',String(blob.size));
  headers.set('accept-ranges','bytes');
  headers.set('x-aio-cached-bytes',String(blob.size));
  headers.set('cache-control','public, max-age=31536000, immutable');
  await cache.put(url,new Response(blob,{status:200,statusText:'OK',headers}));
  return blob.size;
}

async function aioWarmBatch(event){
  const data=event.data||{};
  const urls=[...new Set((Array.isArray(data.urls)?data.urls:[]).map(aioSafeMediaUrl).filter(Boolean))].slice(0,50);
  const source=event.source;
  const maxFile=Math.min(AIO_MAX_FILE_BYTES,Math.max(1,Number(data.maxFileBytes)||AIO_MAX_FILE_BYTES));
  const maxBatch=Math.min(AIO_MAX_CACHE_BYTES,Math.max(1,Number(data.maxBatchBytes)||64*1024*1024));
  const maxCache=Math.min(AIO_MAX_CACHE_BYTES,Math.max(1,Number(data.maxCacheBytes)||AIO_MAX_CACHE_BYTES));
  const cache=await caches.open(AIO_CACHE_NAME);
  let downloadedBytes=0,warmed=0,skipped=0;

  for(const url of urls){
    if(downloadedBytes>=maxBatch)break;
    if(await cache.match(url)){skipped++;continue;}
    try{
      // HEAD avoids fetching a large upload just to discover that it exceeds the warm-up cap.
      let declared=0;
      try{
        const head=await fetch(url,{method:'HEAD',mode:'cors',credentials:'omit',cache:'force-cache'});
        if(head.ok)declared=Number(head.headers.get('content-length')||0);
      }catch{}
      if(declared>maxFile||declared>maxBatch-downloadedBytes){skipped++;continue;}

      const response=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',cache:'force-cache'});
      const size=await aioStoreMedia(cache,url,response,maxFile,maxBatch-downloadedBytes,maxCache);
      if(size){downloadedBytes+=size;warmed++}else skipped++;
    }catch(error){
      skipped++;
    }
  }
  try{source?.postMessage({type:'AIO_SOCIAL_MEDIA_WARM_DONE',downloadedBytes,warmed,skipped})}catch{}
}

async function aioServeCachedMedia(request,proxyUrl){
  const source=aioSafeMediaUrl(proxyUrl.searchParams.get('src'));
  if(!source)return new Response('Not found',{status:404});
  const cache=await caches.open(AIO_CACHE_NAME);
  const cached=await cache.match(source);

  if(!cached){
    const headers=new Headers();
    const range=request.headers.get('range');
    if(range)headers.set('range',range);
    try{
      return await fetch(source,{method:request.method==='HEAD'?'HEAD':'GET',headers,mode:'cors',credentials:'omit'});
    }catch{
      return new Response('Video is not cached and the source is unavailable.',{status:504});
    }
  }

  const range=request.headers.get('range');
  if(request.method==='HEAD')return new Response(null,{status:200,headers:cached.headers});
  if(!range)return cached;

  const bytes=await cached.arrayBuffer();
  const total=bytes.byteLength;
  const match=/^bytes=(\d*)-(\d*)$/i.exec(range.trim());
  if(!match)return new Response(null,{status:416,headers:{'content-range':'bytes */'+total}});
  let start=match[1]?Number(match[1]):null;
  let end=match[2]?Number(match[2]):null;
  if(start===null){
    const suffix=end||0;
    if(!suffix)return new Response(null,{status:416,headers:{'content-range':'bytes */'+total}});
    start=Math.max(0,total-suffix);end=total-1;
  }else{
    if(end===null||end>=total)end=total-1;
  }
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=total||end<start){
    return new Response(null,{status:416,headers:{'content-range':'bytes */'+total}});
  }
  const part=bytes.slice(start,end+1);
  const headers=new Headers(cached.headers);
  headers.set('accept-ranges','bytes');
  headers.set('content-range','bytes '+start+'-'+end+'/'+total);
  headers.set('content-length',String(part.byteLength));
  return new Response(part,{status:206,statusText:'Partial Content',headers});
}

self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('message',event=>{
  if(event.data?.type==='AIO_SOCIAL_MEDIA_WARM'){
    event.waitUntil(aioWarmBatch(event));
  }
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  const proxyPath=new URL('__aio_social_media_cache',self.registration.scope).pathname;
  if(url.origin!==self.location.origin||url.pathname!==proxyPath)return;
  event.respondWith(aioServeCachedMedia(request,url));
});
