/* JALSA service worker — offline app shell */
const CACHE = "jalsa-v10";
const ASSETS = [
  "./", "./index.html",
  "./css/app.css?v=10", "./css/invites.css?v=10",
  "./js/engine.js?v=10", "./js/templates.js?v=10", "./js/store.js?v=10",
  "./js/cloud.js?v=10", "./js/app.js?v=10",
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

// network-first for our own files: always fetch the latest when online, fall
// back to cache only when offline. This prevents stale UI after a deploy.
// Cross-origin calls (Supabase API, fonts) go straight to the network.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
