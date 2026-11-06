// Onglet Placements : saisie et historique des valorisations.

import { etat, sauvegarder } from "../noyau/etat.js";
import { centimesVersEuros, echapper, eurosVersCentimes, nouvelEnregistrement } from "../noyau/outils.js";
import { rafraichir } from "../rendu.js";
import { supprimerAvecAnnulation } from "./notifications.js";

function enregistrerValorisation() {
  const compteId = document.getElementById("valo-compte").value;
  const valeur = eurosVersCentimes(document.getElementById("valo-valeur").value);
  const message = document.getElementById("message-valo");
  if (!compteId) {
    message.textContent = "Crée d'abord un PEA ou une assurance vie";
    return;
  }
  if (isNaN(valeur) || valeur < 0) {
    message.textContent = "Valeur invalide";
    return;
  }
  message.textContent = "";
  etat.valorisations.push({
    ...nouvelEnregistrement("p"),
    compteId: compteId,
    date: new Date().toLocaleDateString("sv-SE"),
    valeur: valeur
  });
  document.getElementById("valo-valeur").value = "";
  sauvegarder();
  rafraichir();
}

export function afficherValorisations() {
  const zone = document.getElementById("liste-valorisations");
  zone.innerHTML = "";
  const recentes = [...etat.valorisations]
    .sort((a, b) => b.creeLe - a.creeLe)
    .slice(0, 10);
  for (const v of recentes) {
    const compte = etat.comptes.find(c => c.id === v.compteId);
    zone.innerHTML += `
      <div class="op">
        <div>${echapper(compte.nom)}<small>${v.date}</small></div>
        <span>${centimesVersEuros(v.valeur)}</span>
        <button class="supprimer" data-id="${v.id}" aria-label="Supprimer">✕</button>
      </div>`;
  }
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initPlacements() {
  document.getElementById("bouton-valo").addEventListener("click", enregistrerValorisation);
  document.getElementById("liste-valorisations").addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    supprimerAvecAnnulation("Valorisation supprimée", () => {
      etat.valorisations = etat.valorisations.filter(v => v.id !== id);
    });
  });
}
