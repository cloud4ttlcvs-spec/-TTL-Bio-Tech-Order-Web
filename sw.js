/* TTL Bio-Tech 戰情中心 SW (App Shell cache only) v98.11.0
   - Same-origin static assets: stale-while-revalidate
   - Cross-origin requests (Google Sheets CSV, CDN): network-only (no cache)
   - No offline guarantee required
*/
const CACHE_NAME = 'ttlbiotech-admin-shell-v98.11.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k.startsWith('ttlbiotech-admin-shell-') && k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve()));
    await self.clients.claim();
  })());
});

function isProbablyCsv(url) {
  return url.searchParams.get('output') === 'csv' || url.pathname.includes('/gviz/tq') || url.href.includes('spreadsheets.google') || url.href.includes('googleusercontent.com');
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
    event.respondWith(fetch(req, {cache: 'no-store'}));
    return;
  }

  // App shell caching: stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then((res) => {
      // Cache only successful basic responses
      try {
        if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      } catch(e) {}
      return res;
    }).catch(() => cached);

    return cached || fetchPromise;
  })());
});
