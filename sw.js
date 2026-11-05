const VERSION = "budget-v6";
const FICHIERS = [
  "./", "./index.html", "./style.css", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./js/main.js",
  "./js/noyau/badges.js",
  "./js/noyau/bilan.js",
  "./js/noyau/categories.js",
  "./js/noyau/comptes.js",
  "./js/noyau/dates.js",
  "./js/noyau/epargne.js",
  "./js/noyau/etat.js",
  "./js/noyau/operations.js",
  "./js/noyau/outils.js",
  "./js/noyau/rappels.js",
  "./js/noyau/recurrences.js",
  "./js/noyau/validation.js",
  "./js/rendu.js",
  "./js/ui/badges.js",
  "./js/ui/bilan.js",
  "./js/ui/budgets.js",
  "./js/ui/categories.js",
  "./js/ui/comptes.js",
  "./js/ui/epargne.js",
  "./js/ui/graphiques.js",
  "./js/ui/mouvements.js",
  "./js/ui/navigation.js",
  "./js/ui/notifications.js",
  "./js/ui/operations.js",
  "./js/ui/placements.js",
  "./js/ui/rappels.js",
  "./js/ui/recurrences.js",
  "./js/ui/saisie.js",
  "./js/ui/sauvegarde.js",
  "./js/ui/selecteurs.js",
  "./js/ui/theme.js"
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