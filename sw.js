const VERSION = "budget-v5";
const FICHIERS = [
  "./", "./index.html", "./style.css", "./app.js", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(noms =>
    Promise.all(noms.filter(n => n !== VERSION).map(n => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith(self.registration.scope)) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then(rep => {
        if (rep.ok) {
          const copie = rep.clone();
          caches.open(VERSION).then(c => c.put(e.request, copie));
        }
        return rep;
      })
      .catch(() => caches.match(e.request).then(rep => rep || Response.error()))
  );
});