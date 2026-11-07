// Règles métier des comptes : soldes, valeur des placements, portée perso/commun.

import { etat } from "./etat.js";

export const TYPES_PLACEMENT = ["pea", "assurance-vie"];

export function estPlacement(compte) {
  return TYPES_PLACEMENT.includes(compte.type);
}

function referencePlacement(compte) {
  let ref = { moment: compte.creeLe, valeur: compte.soldeDepart };
  for (const v of etat.valorisations) {
    if (v.compteId !== compte.id) continue;
    if (v.creeLe > ref.moment) ref = { moment: v.creeLe, valeur: v.valeur };
  }
  return ref;
}

export function valeurEstimee(compte) {
  const ref = referencePlacement(compte);
  let valeur = ref.valeur;
  for (const v of etat.virements) {
    if (v.creeLe <= ref.moment) continue;
    if (v.versId === compte.id) valeur += v.montant;
    if (v.depuisId === compte.id) valeur -= v.montant;
  }
  return valeur;
}

export function netVerse(compte) {
  let total = compte.verseDepart || 0;
  for (const v of etat.virements) {
    if (v.versId === compte.id) total += v.montant;
    if (v.depuisId === compte.id) total -= v.montant;
  }
  return total;
}

export function calculerSolde(compteId) {
  const compte = etat.comptes.find(c => c.id === compteId);
  if (estPlacement(compte)) return valeurEstimee(compte);
  let solde = compte.soldeDepart;
  for (const op of etat.operations) {
    if (op.compteId !== compteId) continue;
    if (op.sens === "revenu") solde += op.montant;
    else solde -= op.montant;
  }
  for (const v of etat.virements) {
    if (v.depuisId === compteId) solde -= v.montant;
    if (v.versId === compteId) solde += v.montant;
  }
  solde += totalAjustements(compteId);
  return solde;
}

// Total des ajustements de solde d'un compte (jusqu'à une date incluse, si elle est précisée).
// Un ajustement corrige le solde sans être une dépense ni un revenu.
export function totalAjustements(compteId, jusquau) {
  let total = 0;
  for (const a of etat.ajustements || []) {
    if (a.compteId === compteId && (!jusquau || a.date <= jusquau)) total += a.montant;
  }
  return total;
}

const ORDRE_TYPES = ["livret", "pea", "assurance-vie", "courant"];

export function ordreType(type) {
  const i = ORDRE_TYPES.indexOf(type);
  return i === -1 ? 99 : i;
}

export function porteeDuCompte(compteId) {
  const compte = etat.comptes.find(c => c.id === compteId);
  return compte.proprietaire === "commun" ? "commun" : "perso";
}

export const NOMS_TYPES = {
  "courant": "Comptes courants",
  "livret": "Livrets",
  "pea": "PEA",
  "assurance-vie": "Assurance vie"
};

export function comptesActifs() {
  return etat.comptes.filter(c => !c.archive && c.type !== "externe");
}

export function totalPar(filtre) {
  let total = 0;
  for (const compte of comptesActifs()) {
    if (filtre(compte)) total += calculerSolde(compte.id);
  }
  return total;
}

const ICONES_TYPES = { "courant": "💳", "livret": "🐷", "pea": "📈", "assurance-vie": "🛡️" };

export function iconeType(type) {
  return ICONES_TYPES[type] || "💰";
}
