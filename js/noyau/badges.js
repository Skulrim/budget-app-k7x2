// Définition des badges et calcul des séries (saisie, jours sans dépassement).

import { porteeDuCompte } from "./comptes.js";
import { aujourdhui, debutSemaine, enJours } from "./dates.js";
import { totalMisDeCote, toutesLesDates } from "./epargne.js";
import { etat } from "./etat.js";

export function serieSaisie() {
  const semaines = new Set(toutesLesDates().map(debutSemaine));
  let semaine = debutSemaine(aujourdhui());
  if (!semaines.has(semaine)) semaine -= 7;
  let serie = 0;
  while (semaines.has(semaine)) {
    serie++;
    semaine -= 7;
  }
  return serie;
}

function dernierDepassement() {
  let dernier = null;
  for (const b of etat.budgets) {
    const ops = etat.operations
      .filter(op => op.sens === "depense" && op.categorie === b.categorie
                    && porteeDuCompte(op.compteId) === b.portee)
      .sort((x, y) => x.date.localeCompare(y.date));
    let moisEnCours = "";
    let cumul = 0;
    let franchi = false;
    for (const op of ops) {
      const mois = op.date.slice(0, 7);
      if (mois !== moisEnCours) {
        moisEnCours = mois;
        cumul = 0;
        franchi = false;
      }
      cumul += op.montant;
      if (cumul > b.montant && !franchi) {
        franchi = true;
        if (dernier === null || op.date > dernier) dernier = op.date;
      }
    }
  }
  return dernier;
}

export function serieSansDepassement() {
  const dates = toutesLesDates().sort();
  if (dates.length === 0) return 0;
  const dernier = dernierDepassement();
  const depart = dernier !== null ? dernier : dates[0];
  return enJours(aujourdhui()) - enJours(depart);
}

export const BADGES = [
  { id: "premier-pas", nom: "Premier pas", desc: "Première opération saisie",
    ok: () => etat.operations.length > 0 },
  { id: "regulier", nom: "Régulier", desc: "4 semaines de saisie d'affilée",
    ok: () => serieSaisie() >= 4 },
  { id: "marathon", nom: "Marathon", desc: "12 semaines de saisie d'affilée",
    ok: () => serieSaisie() >= 12 },
  { id: "sous-controle", nom: "Sous contrôle", desc: "7 jours sans dépasser un plafond",
    ok: () => etat.budgets.length > 0 && serieSansDepassement() >= 7 },
  { id: "mois-serein", nom: "Mois serein", desc: "30 jours sans dépasser un plafond",
    ok: () => etat.budgets.length > 0 && serieSansDepassement() >= 30 },
  { id: "objectif-atteint", nom: "Objectif atteint", desc: "Un objectif d'achat financé",
    ok: () => etat.objectifs.some(o => totalMisDeCote(o.id) >= o.cible) }
];
