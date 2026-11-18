// Message en haut d'écran et bandeau « Annuler » après une suppression.

import { etat, sauvegarder } from "../noyau/etat.js";
import { rafraichirTout } from "../rendu.js";

let minuterie = null;

export function montrerNotif(texte) {
  const n = document.getElementById("notif");
  n.textContent = texte;
  n.hidden = false;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { n.hidden = true; }, 4000);
}

let annulation = null;

let minuterieAnnulation = null;

export function supprimerAvecAnnulation(texte, action) {
  const avant = JSON.stringify(etat);
  action();
  sauvegarder();
  rafraichirTout();
  annulation = { avant: avant, apres: JSON.stringify(etat) };
  document.getElementById("texte-annuler").textContent = texte;
  document.getElementById("bandeau-annuler").hidden = false;
  clearTimeout(minuterieAnnulation);
  minuterieAnnulation = setTimeout(fermerBandeauAnnulation, 6000);
}

function fermerBandeauAnnulation() {
  document.getElementById("bandeau-annuler").hidden = true;
  annulation = null;
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initNotifications() {
  document.getElementById("bouton-annuler").addEventListener("click", () => {
    if (!annulation) return;
    if (JSON.stringify(etat) !== annulation.apres) {
      fermerBandeauAnnulation();
      montrerNotif("Annulation impossible : d'autres modifications ont eu lieu.");
      return;
    }
    const precedent = JSON.parse(annulation.avant);
    fermerBandeauAnnulation();
    Object.assign(etat, precedent);
    sauvegarder();
    rafraichirTout();
    montrerNotif("Suppression annulée");
  });
}
