// Calcul des opérations et virements récurrents qui attendent une validation.

import { aujourdhui, dateEcheance, ecartMois, moisCourant, moisEntre } from "./dates.js";
import { etat } from "./etat.js";

// Fréquences proposées : nombre de mois entre deux échéances
export const FREQUENCES = {
  1: "chaque mois",
  2: "tous les 2 mois",
  3: "chaque trimestre",
  6: "chaque semestre",
  12: "chaque année"
};

// Ce récurrent tombe-t-il ce mois-là ? (sans fréquence enregistrée = chaque mois, comme avant)
export function echeanceCeMois(r, mois) {
  const ecart = ecartMois(r.debut, mois);
  return ecart >= 0 && ecart % (r.frequence || 1) === 0;
}

export function aValider() {
  const liste = [];
  for (const r of etat.recurrentes) {
    const ids = r.type === "virement" ? [r.depuisId, r.versId] : [r.compteId];
    const indisponible = ids.some(id => {
      const c = etat.comptes.find(x => x.id === id);
      return !c || c.archive || c.type === "externe";
    });
    if (indisponible) continue;
    for (const mois of moisEntre(r.debut, moisCourant())) {
      if (!echeanceCeMois(r, mois) || r.traites.includes(mois)) continue;
      const date = dateEcheance(mois, r.jour);
      if (date <= aujourdhui()) liste.push({ r: r, mois: mois, date: date });
    }
  }
  return liste.sort((x, y) => x.date.localeCompare(y.date));
}