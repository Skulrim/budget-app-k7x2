// Réglages : ajuster le solde d'un compte pour qu'il corresponde au solde réel de la banque.

import { calculerSolde } from "../noyau/comptes.js";
import { aujourdhui } from "../noyau/dates.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { centimesVersEuros, echapper, eurosVersCentimes, nouvelEnregistrement } from "../noyau/outils.js";
import { rafraichir } from "../rendu.js";
import { supprimerAvecAnnulation } from "./notifications.js";

// L'utilisateur saisit le solde réel ; l'appli enregistre l'écart sous forme d'ajustement.
// Un ajustement n'est ni une dépense ni un revenu : budgets, bilans et comparaisons ne bougent pas.
export function enregistrerAjustement() {
  const compteId = document.getElementById("ajust-compte").value;
  const reel = eurosVersCentimes(document.getElementById("ajust-solde").value);
  const message = document.getElementById("message-ajust");
  if (!compteId) {
    message.textContent = "Crée d'abord un compte courant ou un livret";
    return;
  }
  if (isNaN(reel)) {
    message.textContent = "Solde invalide";
    return;
  }
  const actuel = calculerSolde(compteId);
  const ecart = reel - actuel;
  if (ecart === 0) {
    message.textContent = "Le solde est déjà exact : rien à ajuster";
    return;
  }
  const signe = ecart > 0 ? "+" : "−";
  if (!confirm("Solde dans l'appli : " + centimesVersEuros(actuel)
      + "\nSolde réel : " + centimesVersEuros(reel)
      + "\nEnregistrer un ajustement de " + signe + " " + centimesVersEuros(Math.abs(ecart)) + " ?")) return;
  message.textContent = "Ajustement de " + signe + " " + centimesVersEuros(Math.abs(ecart)) + " enregistré";
  etat.ajustements.push({
    ...nouvelEnregistrement("a"),
    compteId: compteId,
    montant: ecart,
    date: aujourdhui()
  });
  document.getElementById("ajust-solde").value = "";
  sauvegarder();
  rafraichir();
}

export function afficherAjustements() {
  const zone = document.getElementById("liste-ajustements");
  const recents = [...etat.ajustements].sort((a, b) => b.creeLe - a.creeLe).slice(0, 10);
  if (recents.length === 0) {
    zone.innerHTML = `<div class="mu">Aucun ajustement.</div>`;
    return;
  }
  zone.innerHTML = recents.map(a => {
    const compte = etat.comptes.find(c => c.id === a.compteId);
    const positif = a.montant > 0;
    return `
      <div class="op">
        <div>${echapper(compte ? compte.nom : "?")}<small>${a.date}</small></div>
        <span class="${positif ? "revenu" : ""}">${positif ? "+" : "−"} ${centimesVersEuros(Math.abs(a.montant))}</span>
        <button class="supprimer" data-ajust="${a.id}" aria-label="Supprimer">✕</button>
      </div>`;
  }).join("");
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initAjustements() {
  document.getElementById("bouton-ajust").addEventListener("click", enregistrerAjustement);
  document.getElementById("liste-ajustements").addEventListener("click", (e) => {
    const id = e.target.dataset.ajust;
    if (!id) return;
    supprimerAvecAnnulation("Ajustement supprimé", () => {
      etat.ajustements = etat.ajustements.filter(a => a.id !== id);
    });
  });
}
