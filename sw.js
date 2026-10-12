const CACHE='stay-stoic-2.3.4';
const CORE=['./','index.html','app.js','data1.js','data2.js','audio-player.js','audio-index.js','manifest.json','app-icon.webp','seneca.webp','epictetus.webp','vendor/react.production.min.js','vendor/react-dom.production.min.js'];
let downloading=null;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
async function rangeResponse(request,response){
 const range=request.headers.get('range');if(!range)return response;
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return new Response(null,{status:416});
 const buffer=await response.arrayBuffer(),length=buffer.byteLength;
 let start=match[1]?Number(match[1]):Math.max(0,length-Number(match[2]));let end=match[2]&&match[1]?Number(match[2]):length-1;
 end=Math.min(end,length-1);if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=length)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+length}});
 return new Response(buffer.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Content-Range':`bytes ${start}-${end}/${length}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});
}
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith((async()=>{const c=await caches.open(CACHE),saved=await c.match(event.request.url);if(saved)return url.pathname.endsWith('.mp3')?rangeResponse(event.request,saved):saved;
   const response=await fetch(event.request);if(response.ok&&response.status===200&&!url.pathname.endsWith('.mp3'))await c.put(event.request,response.clone());return response;})());
});
async function cacheAudio(port){
 const response=await fetch('audio-index.json',{cache:'no-store'});if(!response.ok)throw Error('Index unavailable');const index=await response.json();
 const entries=[...new Map(Object.values(index.entries).map(e=>[e.file,e])).values()];const cache=await caches.open(CACHE);let done=0;
 for(const entry of entries){if(!/^audio\/[a-f0-9]{64}\.mp3$/.test(entry.file))throw Error('Invalid asset');
  const url=new URL(entry.file,self.registration.scope).href;let r=await cache.match(url);if(!r)r=await fetch(url);if(!r.ok)throw Error('Download failed');
  const bytes=await r.clone().arrayBuffer();const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(digest!==entry.sha256)throw Error('Corrupt asset');await cache.put(url,r);port?.postMessage({type:'progress',done:++done,total:entries.length});
 }
 if(!entries.length)throw Error('No audio pack available');port?.postMessage({type:'done',total:entries.length});
}
self.addEventListener('message',event=>{if(event.data?.type!=='CACHE_AUDIO')return;const port=event.ports[0];if(downloading){port?.postMessage({type:'error'});return;}
 downloading=cacheAudio(port).catch(()=>port?.postMessage({type:'error'})).finally(()=>{downloading=null;});event.waitUntil(downloading);
});
