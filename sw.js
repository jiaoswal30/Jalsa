/* jalsa service worker — offline app shell, network first */
const CACHE = "jalsa-v21";
const ASSETS = [
  "./", "./index.html",
  "./css/jalsa.css?v=21", "./css/editions.css?v=21",
  "./js/config.js?v=21", "./js/engine.js?v=21", "./js/editions.js?v=21", "./js/store.js?v=21",
  "./js/cloud.js?v=21", "./js/ai.js?v=21", "./js/app.js?v=21",
  "./manifest.webmanifest", "./icon.svg", "./icon-maskable.svg",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// our own files: fetch fresh when online, fall back to cache offline.
// cross-origin (Supabase, fonts) goes straight to the network.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
