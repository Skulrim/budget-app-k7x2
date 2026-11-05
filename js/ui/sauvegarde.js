// Export et import de la sauvegarde JSON.

import { aujourdhui } from "../noyau/dates.js";
import { etat, sauvegarder } from "../noyau/etat.js";
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

function importerSauvegarde(fichier) {
  const message = document.getElementById("message-sauvegarde");
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try {
      const donnees = JSON.parse(lecteur.result);
      if (!etatValide(donnees.etat)) throw new Error("format");
      if (!confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) return;
      Object.assign(etat, { objectifs: [], misesDeCote: [], badges: [], bilansVus: [], plansEpargne: [], recurrentes: [], budgets: [], valorisations: [] }, donnees.etat);
      sauvegarder();
      remplirChoixComptes();
      remplirChoixCategories();
      rafraichir();
      message.textContent = "Sauvegarde importée";
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
