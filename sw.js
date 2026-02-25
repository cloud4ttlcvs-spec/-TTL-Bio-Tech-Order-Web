// sw.js - TTL Bio-Tech Admin (App Shell only) - v98.11.9
const CACHE_NAME = 'ttl-admin-shell-v98.11.9';
const CORE_ASSETS = [
  './',
  './manage_ttlbiotech_f3p4.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Always go to network for cross-origin requests (Sheets CSV, CDNs, etc.)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // Navigation: serve cached shell if available (installability)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./manage_ttlbiotech_f3p4.html').then(cached => cached || fetch(req))
    );
    return;
  }

  // Cache-first for same-origin static files
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
