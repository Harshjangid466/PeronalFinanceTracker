importScripts('/share-target.js');
const CACHE_NAME = "finance-tracker-v2";
const ASSETS = ["/", "/index.html", "/manifest.json", "/icons/icon-192.svg", "/icons/icon-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    FinanceShare.cleanup().catch(() => {}).then(() => caches.keys()).then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (!event.source || new URL(event.source.url).origin !== self.location.origin) return;
  if (event.data?.type === 'cleanup-shared-pdfs') { event.waitUntil(FinanceShare.cleanup().catch(() => {})); return; }
  if (event.data?.type !== 'take-shared-pdf' || !event.ports[0]) return;
  event.waitUntil(FinanceShare.take(event.data.id).then(file => event.ports[0].postMessage({file})).catch(() => event.ports[0].postMessage({error:'storage'})));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname === '/share-statement') {
    event.respondWith(event.request.method === 'POST' ? FinanceShare.receive(event.request) : Promise.resolve(new Response(null,{status:303,headers:{Location:'/?sharedPdfError=invalid','Cache-Control':'no-store'}})));
    return;
  }
  if (url.origin === self.location.origin && event.request.method === 'GET' && (url.searchParams.has('sharedPdf') || url.searchParams.has('sharedPdfError'))) {
    // Serve only the app shell: share tokens must never be cached or sent to hosting.
    event.respondWith(caches.match('/index.html').then(cached => cached || fetch('/index.html',{cache:'no-store'})).then(response => {
      const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.set('Referrer-Policy','no-referrer');
      return new Response(response.body,{status:response.status,headers});
    }));
    return;
  }
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
