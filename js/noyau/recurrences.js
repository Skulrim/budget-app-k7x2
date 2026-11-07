// Calcul des opérations et virements récurrents qui attendent une validation.

import { aujourdhui, dateEcheance, moisCourant, moisEntre } from "./dates.js";
import { etat } from "./etat.js";

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
      if (r.traites.includes(mois)) continue;
      const date = dateEcheance(mois, r.jour);
      if (date <= aujourdhui()) liste.push({ r: r, mois: mois, date: date });
    }
  }
  return liste.sort((x, y) => x.date.localeCompare(y.date));
}
