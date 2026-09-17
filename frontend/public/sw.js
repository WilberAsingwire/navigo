/*
  NAVIGO Service Worker — Fixed to not break SPA navigation
  - Only cache static assets, NOT navigation requests (which should always go network-first)
  - Navigation requests (mode=navigate) return index.html from cache only if offline
*/

const CACHE_NAME = 'navigo-cache-v2';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 SW: Caching app shell v2');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ SW: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin, api calls, and chrome extensions
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  // For navigation requests (user typing /login, /register, etc) — network first, fallback to index.html cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache a copy of index.html for offline
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('/index.html', clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline — return cached index.html so SPA router can handle /login etc
          return caches.match('/index.html').then(cached => cached || caches.match('/'));
        })
    );
    return;
  }

  // For static assets — stale-while-revalidate, but don't cache HTML
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2|json)$/)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchedResponse = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse || null);
          return cachedResponse || fetchedResponse;
        });
      })
    );
  }
  // For other requests, let browser handle (no SW interference) — prevents bounce-back-to-home bug
});
