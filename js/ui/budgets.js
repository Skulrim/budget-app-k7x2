// Écran des budgets : jauges, carte « il te reste », création et retrait.

import { iconeCategorie, nomCategorie } from "../noyau/categories.js";
import { porteeDuCompte } from "../noyau/comptes.js";
import { joursRestants, moisCourant } from "../noyau/dates.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { SEUIL_ALERTE, depenseDuMois } from "../noyau/operations.js";
import { centimesVersEuros, echapper, eurosVersCentimes } from "../noyau/outils.js";
import { rafraichir } from "../rendu.js";
import { cliquerBudget } from "./mouvements.js";
import { supprimerAvecAnnulation } from "./notifications.js";

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
        </div>`;
    }
  }
}

export function afficherReste() {
  let prevu = 0, depense = 0;
  for (const b of etat.budgets) {
    prevu += b.montant;
    depense += depenseDuMois(b.portee, b.categorie);
  }
    const budgetes = new Set(etat.budgets.map(b => b.portee + ":" + b.categorie));
  const comptees = new Set();
  for (const r of etat.recurrentes) {
    if (r.sens !== "depense" || r.debut > moisCourant()) continue;
    const compte = etat.comptes.find(c => c.id === r.compteId);
    if (!compte || compte.archive) continue;
    const portee = porteeDuCompte(r.compteId);
    const cle = portee + ":" + r.categorie;
    if (budgetes.has(cle)) continue;
    prevu += r.montant;
    if (!comptees.has(cle)) {
      comptees.add(cle);
      depense += depenseDuMois(portee, r.categorie);
    }
  }
  const reste = prevu - depense;
  const ratio = prevu > 0 ? Math.min(1, depense / prevu) : 0;
  const circonference = 2 * Math.PI * 40;
  const trait = ratio * circonference;
  document.getElementById("carte-reste").innerHTML = `
    <div class="anneau">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle class="piste" cx="48" cy="48" r="40" fill="none" stroke-width="9"/>
        <circle class="trait" cx="48" cy="48" r="40" fill="none" stroke-width="9"
          stroke-linecap="round" stroke-dasharray="${trait} ${circonference}"
          data-trait="${trait}" data-circ="${circonference}"/>
      </svg>
      <b>${Math.round(ratio * 100)} %</b>
    </div>
    <div>
      <div class="petit">${reste >= 0 ? "Il te reste" : "Tu dépasses de"}</div>
      <div class="gros">${centimesVersEuros(Math.abs(reste))}</div>
      <div class="petit">sur ${centimesVersEuros(prevu)} · ${joursRestants()} jours restants</div>
    </div>`;
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
