const CACHE='quiet-world-shell-v3';
const FILES=[
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/storage.js',
  './js/date.js',
  './js/timer.js',
  './js/day-log.js',
  './js/fragments.js',
  './js/todos.js',
  './js/routines.js',
  './js/mood.js',
  './js/badges.js',
  './js/room.js',
  './js/pwa.js',
  './assets/app-icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(
    keys.filter(key=>key.startsWith('quiet-world-')&&key!==CACHE).map(key=>caches.delete(key))
  )).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin) return;
  event.respondWith(caches.match(request).then(cached=>{
    if(cached) return cached;
    return fetch(request).then(response=>{
      if(response.ok) caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
      return response;
    }).catch(error=>{
      if(request.mode==='navigate') return caches.match('./index.html');
      throw error;
    });
  }));
});
