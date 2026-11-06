// Prévision de la trésorerie à la fin du mois, pour le commun ou pour le perso (aucun affichage).

import { comptesActifs, porteeDuCompte, totalPar } from "./comptes.js";
import { aujourdhui, dernierJourDuMois } from "./dates.js";
import { etat } from "./etat.js";
import { depenseDuMois } from "./operations.js";

function compteActif(id) {
  const c = etat.comptes.find(x => x.id === id);
  return c && !c.archive ? c : null;
}

// Trésorerie prévue au dernier jour du mois pour une portée ("perso" ou "commun") :
//   solde des comptes courants de cette portée
//   + récurrents du mois pas encore validés (revenus, dépenses, virements qui entrent ou sortent de ces comptes)
//   − ce qu'il reste à dépenser dans chaque budget de cette portée (plafond − déjà dépensé),
//     sans recompter les dépenses récurrentes de la même catégorie, déjà prises plus haut.
// Hypothèse prudente : on dépense jusqu'au plafond. Les catégories sans budget ne sont pas estimées.
export function calculerPrevision(portee, dateDuJour = aujourdhui()) {
  const mois = dateDuJour.slice(0, 7);
  const dansLePerimetre = c => c.type === "courant" && porteeDuCompte(c.id) === portee;
  const solde = totalPar(dansLePerimetre);
  let revenus = 0, depenses = 0, virements = 0;
  const recParCategorie = {};
  for (const r of etat.recurrentes) {
    if (r.debut > mois || r.traites.includes(mois)) continue;
    if (r.type === "virement") {
      const de = compteActif(r.depuisId), vers = compteActif(r.versId);
      if (!de || !vers) continue;
      const sortie = dansLePerimetre(de), entree = dansLePerimetre(vers);
      if (sortie === entree) continue; // sans effet sur ces comptes (ou hors périmètre)
      virements += entree ? r.montant : -r.montant;
    } else {
      const compte = compteActif(r.compteId);
      if (!compte || !dansLePerimetre(compte)) continue;
      if (r.sens === "revenu") {
        revenus += r.montant;
      } else {
        depenses += r.montant;
        recParCategorie[r.categorie] = (recParCategorie[r.categorie] || 0) + r.montant;
      }
    }
  }
  let budgets = 0;
  for (const b of etat.budgets.filter(b => b.portee === portee)) {
    const restant = Math.max(0, b.montant - depenseDuMois(b.portee, b.categorie, mois));
    budgets += Math.max(0, restant - (recParCategorie[b.categorie] || 0));
  }
  // Part des budgets déjà consommée (reprend le calcul de l'ancienne carte « Il te reste ») :
  // budgets de cette portée + récurrentes de dépense sans budget, ramenés au dépensé du mois.
  let prevuBudgets = 0, depenseBudgets = 0;
  const budgetsPortee = etat.budgets.filter(b => b.portee === portee);
  const budgetees = new Set(budgetsPortee.map(b => b.categorie));
  for (const b of budgetsPortee) {
    prevuBudgets += b.montant;
    depenseBudgets += depenseDuMois(portee, b.categorie, mois);
  }
  const comptees = new Set();
  for (const r of etat.recurrentes) {
    if (r.sens !== "depense" || r.debut > mois) continue;
    const compte = compteActif(r.compteId);
    if (!compte || porteeDuCompte(r.compteId) !== portee) continue;
    if (budgetees.has(r.categorie)) continue;
    prevuBudgets += r.montant;
    if (!comptees.has(r.categorie)) {
      comptees.add(r.categorie);
      depenseBudgets += depenseDuMois(portee, r.categorie, mois);
    }
  }
  return {
    ratioBudgets: prevuBudgets > 0 ? Math.min(1, depenseBudgets / prevuBudgets) : 0,
    fin: mois + "-" + String(dernierJourDuMois(mois)).padStart(2, "0"),
    solde: solde, revenus: revenus, depenses: depenses, virements: virements, budgets: budgets,
    prevu: solde + revenus - depenses + virements - budgets,
    aDesComptes: comptesActifs().some(dansLePerimetre)
  };
}
