// Rejoindre l'espace commun existant : les données du commun de CET appareil sont remplacées
// par celles de l'espace partagé (aucun accès au DOM ni à Firebase).

import { appliquerChangementDistant, cleDe, espaceConnu, etat, referencesParEspace } from "./etat.js";
import { idsCommun } from "./espaces.js";
import { normaliser } from "./outils.js";

// Les catégories seules ne comptent pas : tout appareil neuf a les catégories par défaut
export function nombreCommunLocal() {
  return referencesParEspace("commun").filter(r => r.liste !== "categories").length;
}

// docs : documents de l'espace partagé. Ne modifie rien.
export function planAdoption(docs) {
  const partages = docs.filter(d => d.liste === "comptes" && !d.supprime && d.data
    && d.data.proprietaire === "commun" && d.data.type !== "externe").map(d => d.data);
  const communs = idsCommun(etat.comptes);
  const anciens = etat.comptes.filter(c => communs.has(c.id) && c.type !== "externe");
  // Anciens comptes communs auxquels mes virements perso (mixtes) font référence : à relier au compte partagé
  const utilises = new Set();
  for (const liste of ["virements", "recurrentes"]) {
    for (const x of etat[liste] || []) {
      if (espaceConnu(liste, cleDe(liste, x)) !== "mixte") continue;
      for (const k of ["depuisId", "versId"]) {
        if (anciens.some(a => a.id === x[k])) utilises.add(x[k]);
      }
    }
  }
  const remap = new Map();
  for (const id of utilises) {
    const ancien = anciens.find(c => c.id === id);
    const memeNom = partages.find(p => normaliser(p.nom) === normaliser(ancien.nom));
    const memeType = partages.filter(p => p.type === ancien.type);
    const cible = memeNom || (memeType.length === 1 ? memeType[0] : null);
    if (!cible) {
      return { ok: false, message: "Impossible de relier « " + ancien.nom
        + " » à un compte de l'espace commun. Rien n'a été modifié." };
    }
    remap.set(id, cible.id);
  }
  return { ok: true, remap: remap, aSupprimer: referencesParEspace("commun") };
}

export function appliquerAdoption(plan) {
  // 1. relier mes virements perso au compte partagé (avant de supprimer l'ancien compte)
  for (const liste of ["virements", "recurrentes"]) {
    for (const x of etat[liste] || []) {
      for (const k of ["depuisId", "versId"]) {
        if (plan.remap.has(x[k])) x[k] = plan.remap.get(x[k]);
      }
    }
  }
  // 2. supprimer en silence l'ancien commun local (aucune trace de suppression : ça ne doit rien effacer chez l'autre)
  for (const r of plan.aSupprimer) appliquerChangementDistant(r.liste, r.cle, null, 0);
}
