const CACHE_NAME = 'mfn-static-v2';
const PRECACHE_URLS = [
  '/manifest.json',
  '/favicon.svg'
];
const STATIC_ASSET_PATTERN = /\.(?:js|css|png|jpg|jpeg|svg|woff2?)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') return;

  // Never intercept API calls or dev-preview module requests
  if (
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/functions/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/src/')
  ) {
    return;
  }

  if (!STATIC_ASSET_PATTERN.test(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response.ok) return response;

          const clone = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          );

          return response;
        })
        .catch(() => Response.error());
    })
  );
});
