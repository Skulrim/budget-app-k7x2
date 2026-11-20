// Affichage des rappels sur l'accueil.

import { echapper } from "../noyau/outils.js";
import { rappels } from "../noyau/rappels.js";

// « Mettre à jour » porte data-creer="valo:<compte>" : creation.js ouvre la fenêtre de mise à jour
export function afficherRappels() {
  document.getElementById("carte-rappels").innerHTML = rappels().map(r => `
    <div class="rappel">
      <span>${echapper(r.texte)}</span>
      <button type="button" class="lien-action" data-rappel="${r.action}"
        ${r.action === "valorisation" ? `data-creer="valo:${echapper(r.compteId || "")}"` : ""}>
        ${r.action === "export" ? "Exporter" : "Mettre à jour"}</button>
    </div>`).join("");
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initRappels(surExport) {
  document.getElementById("carte-rappels").addEventListener("click", (e) => {
    if (e.target.dataset.rappel === "export") surExport();
  });
}