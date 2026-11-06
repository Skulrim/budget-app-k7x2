// Accueil : deux cartes « Prévision de fin de mois » (compte commun, comptes perso).

import { joursRestants } from "../noyau/dates.js";
import { centimesVersEuros } from "../noyau/outils.js";
import { calculerPrevision } from "../noyau/prevision.js";

const CIRCONFERENCE = 2 * Math.PI * 40;

function ligneLegende(numero, nom, montant, denominateur, signe) {
  const pct = denominateur > 0 ? Math.round(montant / denominateur * 100) : 0;
  return `
    <div class="legende-ligne">
      <i class="point pt${numero}"></i><span>${nom}</span>
      <span class="mu-droite">${pct} %</span>
      <strong>${signe}${centimesVersEuros(montant)}</strong>
    </div>`;
}

function textePeriode() {
  const n = joursRestants();
  return n === 0 ? "dernier jour du mois" : n + (n > 1 ? " jours restants" : " jour restant");
}

function dessinerPrevision(portee, idZone, vide) {
  const zone = document.getElementById(idZone);
  const p = calculerPrevision(portee);
  if (!p.aDesComptes) {
    zone.innerHTML = `<div class="mu">${vide}</div>`;
    return;
  }
  const date = new Date(p.fin + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const trait = p.ratioBudgets * CIRCONFERENCE;
  const negatif = p.prevu < 0;

  // L'argent disponible d'ici fin de mois : solde + revenus + virements qui arrivent
  const entrees = Math.max(0, p.virements);
  const base = p.solde + p.revenus + entrees;
  const tranches = [
    { num: 3, nom: "Dépenses récurrentes", montant: p.depenses },
    { num: 4, nom: "Virements récurrents", montant: Math.max(0, -p.virements) },
    { num: 2, nom: "Budgets restants", montant: p.budgets }
  ].filter(t => t.montant > 0);
  const couts = tranches.reduce((s, t) => s + t.montant, 0);
  // Si l'argent ne suffit pas, la barre est remplie par les seules dépenses (pas de part « reste »)
  const denominateur = negatif ? couts : base;

  let barre = tranches.map(t =>
    `<i class="pt${t.num}" style="width:${denominateur > 0 ? (t.montant / denominateur * 100).toFixed(1) : 0}%"></i>`).join("");
  if (!negatif && p.prevu > 0 && base > 0) {
    barre += `<i class="pt1" style="width:${(p.prevu / base * 100).toFixed(1)}%"></i>`;
  }

  let legende = tranches.map(t => ligneLegende(t.num, t.nom, t.montant, denominateur, "− ")).join("");
  if (!negatif && p.prevu > 0 && base > 0) legende += ligneLegende(1, "Reste prévu", p.prevu, base, "");

  let origine = centimesVersEuros(p.solde) + " aujourd'hui";
  if (p.revenus > 0) origine += " + " + centimesVersEuros(p.revenus) + " de revenus";
  if (entrees > 0) origine += " + " + centimesVersEuros(entrees) + " de virements";

  zone.innerHTML = `
    <div class="prev-haut">
      <div class="prev-anneau">
        <svg viewBox="0 0 96 96" aria-hidden="true">
          <circle class="piste" cx="48" cy="48" r="40" fill="none" stroke-width="9"/>
          <circle class="trait" cx="48" cy="48" r="40" fill="none" stroke-width="9"
            stroke-linecap="round" stroke-dasharray="${trait} ${CIRCONFERENCE}"
            data-trait="${trait}" data-circ="${CIRCONFERENCE}"/>
        </svg>
        <div class="prev-anneau-texte"><b>${Math.round(p.ratioBudgets * 100)} %</b><small>budgets</small></div>
      </div>
      <div>
        <div class="mu">Trésorerie prévue le ${date}</div>
        <div class="prev-montant${negatif ? " texte-alerte" : ""}">${centimesVersEuros(p.prevu)}</div>
        <span class="pastille-etat${negatif ? " alerte" : ""}">${negatif ? "Découvert prévu" : "Dans le vert"}</span>
        <small class="mu-droite"> ${textePeriode()}</small>
      </div>
    </div>
    <div class="prev-barre">${barre}</div>
    <div class="mu">Où va l'argent d'ici fin de mois (${origine})</div>
    <div class="legende">${legende}</div>
    ${negatif ? `<small class="variation hausse">Il manque ${centimesVersEuros(-p.prevu)} pour couvrir les dépenses prévues.</small>` : ""}
    <div class="mu">Hypothèse prudente : tu dépenses jusqu'au plafond de chaque budget. Les catégories sans budget ne sont pas estimées.</div>`;
}

export function afficherPrevision() {
  dessinerPrevision("commun", "carte-prevision-commun", "Ajoute un compte courant commun pour obtenir une prévision.");
  dessinerPrevision("perso", "carte-prevision-perso", "Ajoute un compte courant perso pour obtenir une prévision.");
}
