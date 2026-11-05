// Panneau du bilan de fin de mois.

import { calculerBilan } from "../noyau/bilan.js";
import { nomCategorie } from "../noyau/categories.js";
import { moisDecale, nomMois } from "../noyau/dates.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { operationsDuMois } from "../noyau/operations.js";
import { centimesVersEuros, ligneMontant } from "../noyau/outils.js";
import { exporterSauvegarde } from "./sauvegarde.js";

function afficherBilan(mois) {
  const b = calculerBilan(mois);
  const zone = document.getElementById("contenu-bilan");
  if (operationsDuMois(mois).length === 0 && b.epargne === 0 && b.objectifs === 0) {
    zone.innerHTML = `<h2>Bilan de ${nomMois(mois)}</h2><div class="mu">Rien à afficher pour ce mois.</div>`;
    return;
  }
  const solde = b.revenus - b.depenses;
  const total = etat.budgets.length;
  let html = `<h2>Bilan de ${nomMois(mois)}</h2>`;
  html += ligneMontant("Revenus", b.revenus);
  html += ligneMontant("Dépenses", b.depenses);
  html += `<div class="ligne"><span>Solde du mois</span><strong>${solde >= 0 ? "+" : "−"} ${centimesVersEuros(Math.abs(solde))}</strong></div>`;
  html += ligneMontant("Mis de côté (livrets, placements)", b.epargne);
  html += ligneMontant("Objectifs d'achat alimentés", b.objectifs);
   if (b.plansTotal > 0) {
    html += `<div class="ligne"><span>Plans d'épargne tenus</span><strong>${b.plansTenus} sur ${b.plansTotal}</strong></div>`;
  }
  if (b.variation !== null) {
    html += `<div class="ligne"><span>Dépenses vs mois précédent</span><strong>${b.variation > 0 ? "+" : ""}${b.variation} %</strong></div>`;
  }
  if (total > 0) {
    html += `<div class="ligne"><span>Plafonds respectés</span><strong>${b.respectes} sur ${total}</strong></div>`;
    html += b.pire
      ? `<div class="texte-alerte">Plus gros dépassement : ${nomCategorie(b.pire.categorie)} ${b.pire.ecart > 0 ? "(+" + centimesVersEuros(b.pire.ecart) + ")" : "(plafond atteint pile)"}</div>`
      : `<div class="succes">✓ Aucun plafond dépassé</div>`;
  }
  if (b.badges.length > 0) {
    html += `<div class="succes">🏅 Badges du mois : ${b.badges.join(", ")}</div>`;
  }
  html += `<div class="mu">Pense à exporter une sauvegarde de tes données.</div>`;
  zone.innerHTML = html;
}

function moisParDefaut() {
  const precedent = moisDecale(-1);
  return operationsDuMois(precedent).length > 0 ? precedent : moisDecale(0);
}

export function afficherCarteBilan() {
  const mois = moisParDefaut();
  const nouveau = mois === moisDecale(-1) && !etat.bilansVus.includes(mois);
  document.getElementById("carte-bilan").innerHTML = `
    <div class="ligne"><span>📅 Bilan de ${nomMois(mois)}</span>
      ${nouveau ? `<strong class="succes">Nouveau</strong>` : ""}</div>
    <button id="bouton-bilan" type="button" class="lien-action">Voir le bilan</button>`;
}

function ouvrirBilan() {
  const defaut = moisParDefaut();
  const choix = document.getElementById("choix-mois-bilan");
  choix.innerHTML = "";
  const mois = [0, 1, 2, 3, 4, 5].map(n => moisDecale(-n))
    .filter(m => m === defaut || operationsDuMois(m).length > 0);
  for (const m of mois) {
    choix.innerHTML += `<option value="${m}">${nomMois(m)}${m === moisDecale(0) ? " (en cours)" : ""}</option>`;
  }
  choix.value = defaut;
  afficherBilan(defaut);
  document.getElementById("panneau-bilan").hidden = false;
  if (defaut === moisDecale(-1) && !etat.bilansVus.includes(defaut)) {
    etat.bilansVus.push(defaut);
    sauvegarder();
    afficherCarteBilan();
  }
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initBilan() {
  document.getElementById("carte-bilan").addEventListener("click", (e) => {
    if (e.target.id === "bouton-bilan") ouvrirBilan();
  });
  document.getElementById("choix-mois-bilan").addEventListener("change", (e) => {
    afficherBilan(e.target.value);
  });
  document.getElementById("fermer-bilan").addEventListener("click", () => {
    document.getElementById("panneau-bilan").hidden = true;
  });
  document.getElementById("bouton-export-bilan").addEventListener("click", exporterSauvegarde);
  document.getElementById("panneau-bilan").addEventListener("click", (e) => {
    if (e.target !== e.currentTarget) return;
    document.getElementById("panneau-bilan").hidden = true;
  });
}
