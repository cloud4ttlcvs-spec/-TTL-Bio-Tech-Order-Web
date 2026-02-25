/* TTL Bio-Tech 戰情中心 SW (App Shell precache) v98.11.2
   - Precache start_url + manifest + icons (enables installability)
   - Same-origin static assets: stale-while-revalidate
   - Cross-origin requests (Google Sheets CSV, CDN): network-only (no cache)
   - Offline behavior: App shell loads, but data fetches require network
*/
const CACHE_NAME = 'ttlbiotech-admin-shell-v98.11.2';
const PRECACHE_URLS = [
  './manage_ttlbiotech_f3p4.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Install: precache essentials
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k.startsWith('ttlbiotech-admin-shell-') && k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve()));
    await self.clients.claim();
  })());
});

function isProbablyCsv(url) {
  return url.searchParams.get('output') === 'csv'
    || url.pathname.includes('/gviz/tq')
    || url.href.includes('spreadsheets.google')
    || url.href.includes('googleusercontent.com');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache cross-origin (Google Sheets CSV, CDN, etc.)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // Never cache csv-like endpoints even if same-origin
  if (isProbablyCsv(url)) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // Navigation requests: network-first, fallback to cached app shell
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        // Cache latest HTML for faster subsequent load
        const cache = await caches.open(CACHE_NAME);
        try { if (fresh && fresh.ok && fresh.type === 'basic') cache.put('./manage_ttlbiotech_f3p4.html', fresh.clone()); } catch(e) {}
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('./manage_ttlbiotech_f3p4.html')) || Response.error();
      }
    })());
    return;
  }

  // Same-origin static assets: stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((res) => {
      try {
        if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      } catch(e) {}
      return res;
    }).catch(() => cached);

    return cached || fetchPromise;
  })());
});
