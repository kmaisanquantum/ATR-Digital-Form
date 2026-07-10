const CACHE_NAME = 'atr-pwa-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/styles.css',
  '/src/js/sigPad.js',
  '/src/js/formLogic.js',
  '/src/js/api.js',
  '/src/js/auth.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  // Pass API requests directly to network layer
  if (e.request.url.includes('/api/')) {
    return fetch(e.request);
  }
  // Stale-While-Revalidate pattern for asset reliability
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        });
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});

// Periodic outbox flush using background synchronization APIs
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-atr-forms') {
    e.waitUntil(flushOfflineQueue());
  }
});

async function flushOfflineQueue() {
  // IndexedDB or localStorage evaluation loop
  // Iterates and transmits to POST /api/atr
}
