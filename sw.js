/* JALSA service worker — offline app shell */
const CACHE = "jalsa-v4";
const ASSETS = [
  "./", "./index.html",
  "./css/app.css?v=4", "./css/invites.css?v=4",
  "./js/engine.js?v=4", "./js/templates.js?v=4", "./js/store.js?v=4",
  "./js/cloud.js?v=4", "./js/app.js?v=4",
  "./manifest.webmanifest", "./icon.svg", "./icon-maskable.svg",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// cache-first for our shell, network-fallback that also warms the cache (fonts, etc.)
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // never cache cross-origin calls (Supabase API, fonts CDN handled separately) —
  // live data must always hit the network.
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
