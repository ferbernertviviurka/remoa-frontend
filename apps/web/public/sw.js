const SHELL = ['/', '/revisar', '/hoje', '/mapas'];
const SHELL_CACHE = 'remoa-shell-v5';
const START_PATH = '/revisar';
const OFFLINE_DOCUMENT = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(SHELL_CACHE);
        const res = await fetch(OFFLINE_DOCUMENT);
        if (res.ok && !res.redirected) {
          await cache.put(OFFLINE_DOCUMENT, res.clone());
          await cache.put(START_PATH, res);
        }
      } catch {
        /* a later online visit of a shell path still fills the cache */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('remoa-shell') && key !== SHELL_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        try {
          const res = await fetch(event.request);
          const samePath = !res.redirected && new URL(res.url).pathname === url.pathname;
          if (res.ok && samePath) await cache.put(url.pathname, res.clone());
          return res;
        } catch {
          if (url.pathname === START_PATH) return (await cache.match(OFFLINE_DOCUMENT)) ?? (await cache.match(START_PATH)) ?? Response.error();
          return (await cache.match(url.pathname)) ?? Response.error();
        }
      }),
    );
  }
});
