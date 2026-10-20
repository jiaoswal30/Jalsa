/* jalsa service worker — offline app shell, network first */
const CACHE = "jalsa-v22";
const ASSETS = [
  "./", "./index.html",
  "./css/jalsa.css?v=22", "./css/editions.css?v=22",
  "./js/config.js?v=22", "./js/engine.js?v=22", "./js/editions.js?v=22", "./js/store.js?v=22",
  "./js/cloud.js?v=22", "./js/ai.js?v=22", "./js/app.js?v=22",
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
