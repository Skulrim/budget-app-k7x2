// Export et import de la sauvegarde JSON.

import { aujourdhui } from "../noyau/dates.js";
import { espaceDe, idsCommun } from "../noyau/espaces.js";
import { LISTES_SUIVIES, etat, migrerCreeLe, sauvegarder } from "../noyau/etat.js";
import { etatValide } from "../noyau/validation.js";
import { rafraichir } from "../rendu.js";
import { afficherRappels } from "./rappels.js";
import { remplirChoixCategories, remplirChoixComptes } from "./selecteurs.js";

export function exporterSauvegarde() {
  etat.reglages.dernierExport = aujourdhui();
  sauvegarder();
  const contenu = JSON.stringify(
    { version: 1, exporteLe: new Date().toISOString(), etat: etat }, null, 2);
  const blob = new Blob([contenu], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = "budget-sauvegarde-" + new Date().toLocaleDateString("sv-SE") + ".json";
  lien.click();
  URL.revokeObjectURL(url);
  afficherRappels();
}

// Construit le nouvel état à partir de la sauvegarde.
// Tout ce qui en vient reçoit la date d'aujourd'hui : elle fait foi face au cloud.
// Sans avecCommun, le commun actuel (déjà synchronisé) est conservé tel quel.
function etatRestaure(sauv, avecCommun) {
  const maintenant = Date.now();
  const resultat = { ...sauv, suppressions: etat.suppressions || [] };
  const communsSauv = idsCommun(sauv.comptes);
  const communsLocal = idsCommun(etat.comptes);
  for (const liste of LISTES_SUIVIES) {
    if (!Array.isArray(sauv[liste])) continue; // ancienne sauvegarde sans cette liste : on garde l'actuelle
    const venantDeSauv = sauv[liste]
      .filter(x => avecCommun || espaceDe(liste, x, communsSauv) !== "commun")
      .map(x => ({ ...x, modifieLe: maintenant }));
    const gardes = avecCommun ? [] : (etat[liste] || [])
      .filter(x => espaceDe(liste, x, communsLocal) === "commun");
    resultat[liste] = [...venantDeSauv, ...gardes];
  }
  // Virements perso → commun : on ne les garde que si les deux comptes existent encore
  const idsComptes = new Set(resultat.comptes.map(c => c.id));
  let ignores = 0;
  for (const liste of ["virements", "recurrentes"]) {
    resultat[liste] = resultat[liste].filter(x => {
      const ok = ["depuisId", "versId"].every(k => x[k] === undefined || idsComptes.has(x[k]));
      if (!ok) ignores++;
      return ok;
    });
  }
  return { resultat, ignores };
}

function importerSauvegarde(fichier) {
  const message = document.getElementById("message-sauvegarde");
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try {
      const donnees = JSON.parse(lecteur.result);
      if (!etatValide(donnees.etat)) throw new Error("format");
      if (!confirm("Remplacer tes données perso par cette sauvegarde ?")) return;
      const avecCommun = confirm("Restaurer AUSSI le compte commun ?\n\n"
        + "OK = oui : à utiliser seulement si l'espace partagé est perdu. "
        + "Ça efface ce que ta compagne a saisi depuis cette sauvegarde.\n\n"
        + "Annuler = non : le commun reste tel qu'il est (recommandé).");
      const base = { objectifs: [], misesDeCote: [], badges: [], bilansVus: [], plansEpargne: [], recurrentes: [], budgets: [], valorisations: [], ajustements: [], suppressions: [] };
      const { resultat, ignores } = etatRestaure({ ...base, ...donnees.etat }, avecCommun);
      Object.assign(etat, resultat);
      migrerCreeLe();
      sauvegarder();
      remplirChoixComptes();
      remplirChoixCategories();
      rafraichir();
      message.textContent = "Sauvegarde importée"
        + (ignores > 0 ? " (" + ignores + " virement(s) ignoré(s) : compte commun introuvable)" : "");
    } catch (e) {
      message.textContent = "Fichier non valide";
    }
  };
  lecteur.readAsText(fichier);
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initSauvegarde() {
  document.getElementById("bouton-export").addEventListener("click", exporterSauvegarde);
  document.getElementById("fichier-import").addEventListener("change", (e) => {
    if (e.target.files[0]) importerSauvegarde(e.target.files[0]);
    e.target.value = "";
  });
}
