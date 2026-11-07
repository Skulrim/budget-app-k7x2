// Calculs d'épargne : enveloppes d'objectifs, virements du mois, historique et courbe.

import { estPlacement, totalAjustements, totalPar } from "./comptes.js";
import { dateDuMoment, dernierJourDuMois, moisCourant, moisEntre } from "./dates.js";
import { etat } from "./etat.js";

export function totalEnveloppes() {
  return etat.misesDeCote.reduce((somme, m) => somme + m.montant, 0);
}

export function totalMisDeCote(objectifId) {
  let total = 0;
  for (const m of etat.misesDeCote) {
    if (m.objectifId === objectifId) total += m.montant;
  }
  return total;
}

export function virementsVersLeMois(compteId, mois = moisCourant()) {
  return etat.virements
    .filter(v => v.versId === compteId && v.date.startsWith(mois))
    .reduce((somme, v) => somme + v.montant, 0);
}

export function toutesLesDates() {
  const dates = [];
  for (const liste of [etat.operations, etat.virements, etat.valorisations, etat.misesDeCote]) {
    for (const x of liste) dates.push(x.date);
  }
  return dates;
}

export function premiereUtilisation() {
  const moments = [];
  for (const liste of [etat.comptes, etat.operations, etat.virements,
                       etat.valorisations, etat.misesDeCote]) {
    for (const x of liste) {
      const m = x.creeLe;
      if (m > 1e12) moments.push(m);
    }
  }
  return moments.length > 0 ? dateDuMoment(Math.min(...moments)) : null;
}

function soldeAu(compte, date) {
  let solde = compte.soldeDepart;
  if (estPlacement(compte)) {
    let ref = null;
    for (const v of etat.valorisations) {
      if (v.compteId !== compte.id || v.date > date) continue;
      if (!ref || v.date > ref.date
          || (v.date === ref.date && v.creeLe > ref.creeLe)) ref = v;
    }
    if (ref) solde = ref.valeur;
    for (const v of etat.virements) {
      if (v.date > date || (ref && v.date <= ref.date)) continue;
      if (v.versId === compte.id) solde += v.montant;
      if (v.depuisId === compte.id) solde -= v.montant;
    }
    return solde;
  }
  for (const op of etat.operations) {
    if (op.compteId !== compte.id || op.date > date) continue;
    solde += op.sens === "revenu" ? op.montant : -op.montant;
  }
  for (const v of etat.virements) {
    if (v.date > date) continue;
    if (v.versId === compte.id) solde += v.montant;
    if (v.depuisId === compte.id) solde -= v.montant;
  }
  solde += totalAjustements(compte.id, date);
  return solde;
}

function debutHistorique() {
  const dates = toutesLesDates();
  for (const c of etat.comptes) {
    if (c.creeLe > 1e12) dates.push(dateDuMoment(c.creeLe));
  }
  return dates.length > 0 ? dates.sort()[0].slice(0, 7) : null;
}

export function serieEpargne() {
  const debut = debutHistorique();
  if (!debut) return [];
  return moisEntre(debut, moisCourant()).slice(-12).map(m => {
    if (m === moisCourant()) {
      return { mois: m, valeur: totalPar(c => c.type !== "courant") };
    }
    const date = m + "-" + String(dernierJourDuMois(m)).padStart(2, "0");
    let total = 0;
    for (const c of etat.comptes) {
      if (c.type !== "courant" && c.type !== "externe") total += soldeAu(c, date);
    }
    return { mois: m, valeur: total };
  });
}
