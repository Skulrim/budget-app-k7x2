// Règles des rappels (sauvegarde ancienne, valeur de placement périmée).

import { comptesActifs, estPlacement } from "./comptes.js";
import { dateDuMoment, joursDepuis } from "./dates.js";
import { premiereUtilisation } from "./epargne.js";
import { etat } from "./etat.js";

const JOURS_RAPPEL_EXPORT = 30;

const JOURS_RAPPEL_VALEUR = 35;

export function rappels() {
  const liste = [];
  const premiere = premiereUtilisation();
  const dernier = etat.reglages.dernierExport;
  if (premiere) {
    if (!dernier) {
      if (joursDepuis(premiere) >= 7) {
        liste.push({ texte: "Tu n'as encore jamais exporté de sauvegarde.", action: "export" });
      }
    } else if (joursDepuis(dernier) >= JOURS_RAPPEL_EXPORT) {
      liste.push({ texte: "Dernière sauvegarde : il y a " + joursDepuis(dernier) + " jours.", action: "export" });
    }
  }

  const anciens = [];
  for (const c of comptesActifs().filter(estPlacement)) {
    let derniere = null;
    for (const v of etat.valorisations) {
      if (v.compteId === c.id && (!derniere || v.date > derniere)) derniere = v.date;
    }
    if (!derniere && c.creeLe > 1e12) derniere = dateDuMoment(c.creeLe);
    if (derniere && joursDepuis(derniere) >= JOURS_RAPPEL_VALEUR) {
      anciens.push({ compte: c, jours: joursDepuis(derniere) });
    }
  }
  if (anciens.length === 1) {
    liste.push({
      texte: "La valeur de « " + anciens[0].compte.nom + " » date de " + anciens[0].jours + " jours.",
      action: "valorisation",
      compteId: anciens[0].compte.id
    });
  } else if (anciens.length > 1) {
    liste.push({
      texte: "Valeurs à mettre à jour : "
        + anciens.map(a => a.compte.nom + " (" + a.jours + " j)").join(", ") + ".",
      action: "valorisation",
      compteId: anciens[0].compte.id
    });
  }
  return liste;
}
