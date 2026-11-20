// Pastilles d'onglets (Accueil, Livrets…) et badge « à traiter » de l'Accueil.
// Chaque groupe de pastilles agit seulement dans sa vue : un panneau = une div .onglet-accueil
// dont l'id est « onglet- » + le data-onglet de sa pastille.

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

function afficherOnglet(vue, nom) {
  for (const o of vue.querySelectorAll(".onglet-accueil")) {
    o.hidden = (o.id !== "onglet-" + nom);
  }
  for (const b of vue.querySelectorAll(".pastilles button")) {
    b.classList.toggle("actif", b.dataset.onglet === nom);
  }
  animerJauges(); // rejoue l'animation des jauges et anneaux du nouvel onglet
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initAccueil() {
  document.addEventListener("click", (e) => {
    const bouton = e.target.closest(".pastilles [data-onglet]");
    if (bouton) afficherOnglet(bouton.closest(".vue"), bouton.dataset.onglet);
  });
}