// Offline-Fähigkeit: App-Hülle, Schriften und Firebase-SDK aus dem Cache.
// Firestore-Datenverkehr (firestore.googleapis.com) wird nicht angefasst.
const CACHE = "gw-tour-v2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];
const CDN_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Sofort aus dem Cache, im Hintergrund aktualisieren (neue Version beim nächsten Öffnen).
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req, { ignoreSearch: true });
        const network = fetch(req)
          .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  if (CDN_HOSTS.includes(url.hostname) && !url.pathname.includes("/channel")) {
    // Versionierte Bibliotheken und Schriften: einmal laden, dann aus dem Cache.
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok || res.type === "opaque") cache.put(req, res.clone());
        return res;
      })
    );
  }
});
