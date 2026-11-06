// Calculs sur les opérations : dépenses du mois, plafonds, liste fusionnée opérations + virements.

import { porteeDuCompte } from "./comptes.js";
import { aujourdhui, dernierJourDuMois, moisCourant, moisDecale, moisPrecedent } from "./dates.js";
import { etat } from "./etat.js";
import { normaliser } from "./outils.js";

export const SEUIL_ALERTE = 0.8;

export function depenseDuMois(portee, categorieId, mois = moisCourant()) {
  let total = 0;
  for (const op of etat.operations) {
    if (op.sens !== "depense") continue;
    if (op.categorie !== categorieId) continue;
    if (!op.date.startsWith(mois)) continue;
    if (porteeDuCompte(op.compteId) !== portee) continue;
    total += op.montant;
  }
  return total;
}

export function depensesMensuelles() {
  const totaux = [];
  for (let n = 1; n <= 3; n++) {
    const mois = moisDecale(-n);
    let total = 0;
    for (const op of etat.operations) {
      if (op.sens === "depense" && op.date.startsWith(mois)) total += op.montant;
    }
    if (total > 0) totaux.push(total);
  }
  if (totaux.length > 0) {
    const somme = totaux.reduce((a, b) => a + b, 0);
    return { montant: Math.round(somme / totaux.length), source: "tes dépenses des mois passés" };
  }
  const prevu = etat.budgets.reduce((s, b) => s + b.montant, 0);
  return { montant: prevu, source: "tes budgets (pas encore d'historique)" };
}

export function entreesPour(portee) {
  const entrees = [];
  for (const op of etat.operations) {
    if (porteeDuCompte(op.compteId) === portee) {
      entrees.push({ type: "op", date: op.date, id: op.id, donnee: op });
    }
  }
  for (const v of etat.virements) {
    if (porteeDuCompte(v.depuisId) === portee || porteeDuCompte(v.versId) === portee) {
      entrees.push({ type: "virement", date: v.date, id: v.id, donnee: v });
    }
  }
  return entrees.sort((a, b) =>
    b.date.localeCompare(a.date) || b.donnee.creeLe - a.donnee.creeLe);
}

export function operationsDuMois(mois) {
  return etat.operations.filter(op => op.date.startsWith(mois));
}

export function moisAvecMouvements(portee) {
  const mois = new Set([moisCourant()]);
  for (const e of entreesPour(portee)) mois.add(e.date.slice(0, 7));
  return [...mois].sort().reverse();
}

export function texteRecherche(e) {
  if (e.type === "op") {
    const cat = etat.categories.find(c => c.id === e.donnee.categorie);
    const compte = etat.comptes.find(c => c.id === e.donnee.compteId);
    return normaliser((cat ? cat.nom : "") + " " + (compte ? compte.nom : "")
      + " " + (e.donnee.note || ""));
  }
  const de = etat.comptes.find(c => c.id === e.donnee.depuisId);
  const vers = etat.comptes.find(c => c.id === e.donnee.versId);
  return normaliser("virement " + (de ? de.nom : "") + " " + (vers ? vers.nom : "")
    + " " + (e.donnee.note || ""));
}

export function depensesParCategorie(portee, mois = moisCourant(), jourMax = 31) {
  const totaux = {};
  for (const op of etat.operations) {
    if (op.sens !== "depense" || !op.date.startsWith(mois)) continue;
    if (Number(op.date.slice(8, 10)) > jourMax) continue;
    if (porteeDuCompte(op.compteId) !== portee) continue;
    totaux[op.categorie] = (totaux[op.categorie] || 0) + op.montant;
  }
  return Object.entries(totaux)
    .map(([categorie, montant]) => ({ categorie: categorie, montant: montant }))
    .sort((a, b) => b.montant - a.montant);
}

// Dépenses du mois précédent, arrêtées au même jour du mois qu'aujourd'hui.
// Si le mois précédent est plus court (ex. le 31 vs un mois de 30 jours), on s'arrête à son dernier jour.
export function comparaisonMoisPrecedent(portee, dateDuJour = aujourdhui()) {
  const jour = Number(dateDuJour.slice(8, 10));
  const precedent = moisPrecedent(dateDuJour.slice(0, 7));
  const jourPrecedent = Math.min(jour, dernierJourDuMois(precedent));
  const lignes = depensesParCategorie(portee, precedent, jourPrecedent);
  const parCategorie = {};
  for (const l of lignes) parCategorie[l.categorie] = l.montant;
  return {
    jour: jour,
    jourPrecedent: jourPrecedent,
    parCategorie: parCategorie,
    total: lignes.reduce((s, l) => s + l.montant, 0)
  };
}

// Variation en % (arrondie). null si le mois précédent est à 0 : on ne divise pas par zéro.
export function variationPourcent(actuel, precedent) {
  return precedent > 0 ? Math.round((actuel - precedent) / precedent * 100) : null;
}
