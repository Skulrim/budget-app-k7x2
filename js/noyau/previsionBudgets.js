// Prévision de fin de mois pour un budget (aucun accès au DOM).

import { comptesActifs, porteeDuCompte } from "./comptes.js";
import { aujourdhui, dernierJourDuMois } from "./dates.js";
import { etat } from "./etat.js";
import { depenseDuMois } from "./operations.js";

// Avant ce jour du mois, une extrapolation au rythme actuel serait trop instable
// (un seul gros achat le 2 fausserait tout).
export const JOUR_MIN_PREVISION = 5;

// Opérations récurrentes de dépense qui concernent ce budget (même catégorie, même portée)
function recurrentesDuBudget(b) {
  const actifs = new Set(comptesActifs().map(c => c.id));
  return etat.recurrentes.filter(r =>
    r.type !== "virement" && r.sens === "depense" && r.categorie === b.categorie
    && actifs.has(r.compteId) && porteeDuCompte(r.compteId) === b.portee);
}

// Renvoie { prevision, mode } ; prevision vaut null si c'est trop tôt dans le mois.
//  - mode "recurrent" : catégorie avec une opération récurrente (loyer, abonnement…).
//    On n'extrapole pas (un loyer payé le 1er ne se répète pas) :
//    prévision = déjà dépensé + récurrentes de ce mois pas encore validées.
//  - mode "rythme" : sinon, dépensé à ce jour / jours écoulés x jours du mois.
export function previsionBudget(b, jour = aujourdhui()) {
  const mois = jour.slice(0, 7);
  const ecoules = Number(jour.slice(8, 10));
  const depense = depenseDuMois(b.portee, b.categorie, mois);
  const recurrentes = recurrentesDuBudget(b).filter(r => r.debut <= mois);
  if (recurrentes.length > 0) {
    const aVenir = recurrentes
      .filter(r => !r.traites.includes(mois))
      .reduce((s, r) => s + r.montant, 0);
    return { prevision: depense + aVenir, mode: "recurrent" };
  }
  if (ecoules < JOUR_MIN_PREVISION) return { prevision: null, mode: "rythme" };
  return { prevision: Math.round(depense / ecoules * dernierJourDuMois(mois)), mode: "rythme" };
}
