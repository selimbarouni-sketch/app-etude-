/* Service worker : permet l'installation de l'application et son ouverture hors connexion. */
const CACHE = "profsuivi-v1";
const COQUILLE = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Pages : réseau d'abord (pour avoir la dernière version), cache si hors connexion
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copie = r.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copie));
          return r;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Fichiers (JS, CSS, images) : cache d'abord, puis réseau
  e.respondWith(
    caches.match(req).then(
      (enCache) =>
        enCache ||
        fetch(req).then((r) => {
          if (r.ok) {
            const copie = r.clone();
            caches.open(CACHE).then((c) => c.put(req, copie));
          }
          return r;
        })
    )
  );
});
