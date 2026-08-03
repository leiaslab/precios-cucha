const CACHE = 'precios-cucha-v1';
const ASSETS = ['./','./index.html','./app.css','./app-1.js','./app-1b.js','./app-2.js','./manifest.webmanifest','./icon-192.png','./apple-touch-icon.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch(_) { return; }
  const isNav = req.mode === 'navigate' || (req.headers.get('accept')||'').includes('text/html');
  if (isNav) {
    // Página: red primero (para recibir actualizaciones), con respaldo offline
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Recursos: caché primero (rápido y offline)
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (url.origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => cached))
  );
});
