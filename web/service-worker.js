// Velox 1 Race Roulette — Service Worker
// Strategy: stale-while-revalidate
//   • Serve from cache immediately (instant offline load)
//   • Update the cache from the network in the background
//   • On first visit all assets are cached automatically

const CACHE_NAME = 'velox1-v1';
const SHELL_URL = '/index.html';

// ─── Install ──────────────────────────────────────────────────────────────────
// Pre-cache the app shell so the first offline visit still works.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(['/', SHELL_URL]))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
// Delete caches from old versions so stale assets don't linger.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests from our own origin.
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Always kick off a background network request to keep the cache fresh.
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => null);

      // If we have a cached copy, return it immediately (fast) and
      // let the network request update the cache silently in the background.
      if (cached) {
        networkFetch.catch(() => {});
        return cached;
      }

      // Nothing in cache yet — wait for the network.
      return networkFetch.then((response) => {
        if (response) return response;

        // Network also failed (truly offline, first visit to this resource).
        // For page navigations, return the app shell so the SPA can still boot.
        if (event.request.mode === 'navigate') {
          return caches.match(SHELL_URL);
        }

        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
