// Accueil à onglets (Aujourd'hui / Évolution / Comptes) et badge « à traiter ».

import { rappels } from "../noyau/rappels.js";
import { aValider } from "../noyau/recurrences.js";
import { animerJauges } from "./navigation.js";

// Nombre de choses qui attendent l'utilisateur : opérations à valider + rappels
export function afficherBadgeAccueil() {
  const n = aValider().length + rappels().length;
  const badge = document.getElementById("badge-aujourdhui");
  badge.textContent = n;
  badge.hidden = (n === 0);
}

function afficherOnglet(nom) {
  for (const o of document.querySelectorAll(".onglet-accueil")) {
    o.hidden = (o.id !== "onglet-" + nom);
  }
  for (const b of document.querySelectorAll("#onglets-accueil button")) {
    b.classList.toggle("actif", b.dataset.onglet === nom);
  }
  animerJauges(); // rejoue l'animation des jauges et anneaux du nouvel onglet
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initAccueil() {
  document.getElementById("onglets-accueil").addEventListener("click", (e) => {
    const bouton = e.target.closest("[data-onglet]");
    if (bouton) afficherOnglet(bouton.dataset.onglet);
  });
}