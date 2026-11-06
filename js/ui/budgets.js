// Écran des budgets : jauges, prévision de fin de mois par budget, création et retrait.

import { iconeCategorie, nomCategorie } from "../noyau/categories.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { SEUIL_ALERTE, depenseDuMois } from "../noyau/operations.js";
import { centimesVersEuros, echapper, eurosVersCentimes } from "../noyau/outils.js";
import { JOUR_MIN_PREVISION, previsionBudget } from "../noyau/previsionBudgets.js";
import { rafraichir } from "../rendu.js";
import { cliquerBudget } from "./mouvements.js";
import { supprimerAvecAnnulation } from "./notifications.js";

// Ligne « fin de mois » d'une carte de budget
function textePrevision(b) {
  const { prevision, mode } = previsionBudget(b);
  if (prevision === null) {
    return `<small class="variation">Prévision de fin de mois dès le ${JOUR_MIN_PREVISION} du mois</small>`;
  }
  if (prevision === 0) return "";
  const precision = mode === "recurrent" ? "récurrents inclus" : "au rythme actuel";
  if (prevision > b.montant) {
    return `<small class="variation hausse">Fin de mois (${precision}) : ${centimesVersEuros(prevision)}, dépassement prévu de ${centimesVersEuros(prevision - b.montant)}</small>`;
  }
  return `<small class="variation">Fin de mois (${precision}) : ${centimesVersEuros(prevision)}, dans le plafond</small>`;
}

export function afficherBudgets() {
  for (const portee of ["perso", "commun"]) {
    const zone = document.getElementById("liste-budgets-" + portee);
    zone.innerHTML = "";
    for (const b of etat.budgets.filter(b => b.portee === portee)) {
      const depense = depenseDuMois(b.portee, b.categorie);
      const ratio = depense / b.montant;
      const pct = Math.min(100, Math.round(ratio * 100));
      const alerte = ratio >= SEUIL_ALERTE;
      let texte = "Presque au plafond";
      if (depense > b.montant) texte = "Plafond dépassé de " + centimesVersEuros(depense - b.montant);
      else if (depense === b.montant) texte = "Plafond atteint : il ne reste rien";
      zone.innerHTML += `
                <div class="budget cliquable" data-detail="${b.portee}:${echapper(b.categorie)}">
          <div class="budget-ligne">
            <span>${iconeCategorie(b.categorie)} ${nomCategorie(b.categorie)}</span>
            <span>${centimesVersEuros(depense)} / ${centimesVersEuros(b.montant)}
              <button class="supprimer" data-portee="${b.portee}" data-cat="${echapper(b.categorie)}"
                aria-label="Retirer ce budget">✕</button></span>
          </div>
          <div class="jauge">
            <div class="jauge-remplie ${alerte ? "alerte" : ""}" data-pct="${pct}" style="width:${pct}%"></div>
          </div>
          ${alerte ? `<small class="texte-alerte">${texte}</small>` : ""}
          ${textePrevision(b)}
        </div>`;
    }
  }
}

function enregistrerBudget() {
  const portee = document.getElementById("budget-portee").value;
  const categorieId = document.getElementById("budget-categorie").value;
  const montant = eurosVersCentimes(document.getElementById("budget-montant").value);
  const message = document.getElementById("message-budget");
  if (!categorieId) {
    message.textContent = "Aucune catégorie : ajoutes-en une d'abord";
    return;
  }
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  const existant = etat.budgets.find(b =>
    b.portee === portee && b.categorie === categorieId);
  if (existant) {
    existant.montant = montant;
    message.textContent = "Budget mis à jour";
  } else {
    etat.budgets.push({ portee: portee, categorie: categorieId, montant: montant });
    message.textContent = "Budget ajouté";
  }
  document.getElementById("budget-montant").value = "";
  sauvegarder();
  rafraichir();
}

function retirerBudget(e) {
  const portee = e.target.dataset.portee;
  const cat = e.target.dataset.cat;
  if (!portee || !cat) return;
  supprimerAvecAnnulation("Budget retiré", () => {
    etat.budgets = etat.budgets.filter(b => !(b.portee === portee && b.categorie === cat));
  });
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initBudgets() {
  document.getElementById("bouton-budget").addEventListener("click", enregistrerBudget);
  document.getElementById("liste-budgets-perso").addEventListener("click", retirerBudget);
  document.getElementById("liste-budgets-commun").addEventListener("click", retirerBudget);
  document.getElementById("liste-budgets-perso").addEventListener("click", cliquerBudget);
  document.getElementById("liste-budgets-commun").addEventListener("click", cliquerBudget);
}
