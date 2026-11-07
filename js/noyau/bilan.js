// Calcul du bilan d'un mois (aucun affichage).

import { BADGES } from "./badges.js";
import { moisPrecedent } from "./dates.js";
import { virementsVersLeMois } from "./epargne.js";
import { etat } from "./etat.js";
import { depenseDuMois, operationsDuMois } from "./operations.js";
import { somme } from "./outils.js";

export function calculerBilan(mois) {
  const ops = operationsDuMois(mois);
  const revenus = somme(ops.filter(o => o.sens === "revenu"));
  const depenses = somme(ops.filter(o => o.sens === "depense"));

  let epargne = 0;
  for (const v of etat.virements) {
    if (!v.date.startsWith(mois)) continue;
    const de = etat.comptes.find(c => c.id === v.depuisId);
    const vers = etat.comptes.find(c => c.id === v.versId);
    if (de.type === "externe" || vers.type === "externe") continue; // versement venu de l'espace commun
    if (de.type === "courant" && vers.type !== "courant") epargne += v.montant;
    if (de.type !== "courant" && vers.type === "courant") epargne -= v.montant;
  }

  let respectes = 0;
  let pire = null;
  for (const b of etat.budgets) {
    const d = depenseDuMois(b.portee, b.categorie, mois);
    if (d > b.montant) {
      const ecart = d - b.montant;
      if (!pire || ecart > pire.ecart) pire = { categorie: b.categorie, ecart: ecart };
    } else {
      respectes++;
    }
  }

  const depensesPrec = somme(operationsDuMois(moisPrecedent(mois))
    .filter(o => o.sens === "depense"));
  const variation = depensesPrec > 0
    ? Math.round((depenses - depensesPrec) / depensesPrec * 100) : null;

  const badges = etat.badges
    .filter(x => x.date.startsWith(mois))
    .map(x => BADGES.find(b => b.id === x.id))
    .filter(Boolean)
    .map(b => b.nom);
 const plans = etat.plansEpargne.filter(p =>
    etat.comptes.some(c => c.id === p.compteId && !c.archive));
  const plansTenus = plans.filter(p => virementsVersLeMois(p.compteId, mois) >= p.montant).length;
  const plansTotal = plans.length;
  
return { revenus, depenses, epargne, respectes, pire, variation, badges, plansTenus, plansTotal,
           objectifs: somme(etat.misesDeCote.filter(m => m.date.startsWith(mois))) };
}
