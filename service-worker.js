const CACHE='quiet-world-shell-v6-original';
const FILES=['./','./index.html','./manifest.webmanifest','./css/app.css','./css/theme-original.css','./js/app.js','./js/game-data.js','./js/game-store.js','./js/ore-ui.js','./js/ore-rewards.js','./js/legacy-migration.js','./assets/app-icon.svg',...Array.from({length:7},(_,i)=>`./assets/ores/pixil-layer-${i}.png`)];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('quiet-world-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  // Network first: online changes are never trapped behind an old cached shell.
  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&FILES.some(f=>new URL(f,self.location.href).href===request.url)){
      const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));
    }
    return response;
  }).catch(async()=>{
    const cached=await caches.match(request);if(cached)return cached;
    if(request.mode==='navigate')return caches.match('./index.html');
    return new Response('오프라인에서 이 파일을 찾지 못했어요.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  }));
});
