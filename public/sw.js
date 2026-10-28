const CACHE_NAME = "finance-tracker-v2";
const ASSETS = ["/", "/index.html", "/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Account responses and single-use callback URLs must never enter the offline cache.
  if (event.request.method !== "GET" || url.pathname.startsWith('/api/') ||
      ['token_hash','access_token','refresh_token','code'].some(key => url.searchParams.has(key))) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && !response.headers.get("Cache-Control")?.includes("no-store") && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      // Application code uses the network when available, with an explicit offline fallback.
      return fetchPromise.catch(() => cached || Response.error()).then(
        (response) => response || cached || Response.error()
      );
    })
  );
});
