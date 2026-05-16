const VERSION = 'v12';
const CACHE = `freelance-${VERSION}`;

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        const old = keys.filter(k => k !== CACHE);
        return Promise.all(old.map(k => caches.delete(k))).then(() => old.length > 0);
      })
      .then(wasUpdate => self.clients.claim().then(() => {
        if (wasUpdate) {
          self.clients.matchAll({ type: 'window' }).then(clients =>
            clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
          );
        }
      }))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate';
  const isAsset = /\.(js|css|woff2?|png|jpg|svg|ico|webp|mp4)(\?.*)?$/.test(url.pathname);

  // HTML (navigazione): sempre rete — mai cache. Garantisce HTML fresco ad ogni caricamento.
  if (isNavigation) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Asset statici (JS/CSS/immagini): rete → cache solo se risposta OK
  if (isAsset) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Tutto il resto: rete con fallback cache
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
