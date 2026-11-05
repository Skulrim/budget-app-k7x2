// Affichage des rappels sur l'accueil.

import { echapper } from "../noyau/outils.js";
import { rappels } from "../noyau/rappels.js";
import { afficherVue } from "./navigation.js";

export function afficherRappels() {
  document.getElementById("carte-rappels").innerHTML = rappels().map(r => `
    <div class="rappel">
      <span>${echapper(r.texte)}</span>
      <button type="button" class="lien-action" data-rappel="${r.action}"
        data-compte="${echapper(r.compteId || "")}">
        ${r.action === "export" ? "Exporter" : "Mettre à jour"}</button>
    </div>`).join("");
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initRappels(surExport) {
  document.getElementById("carte-rappels").addEventListener("click", (e) => {
    const action = e.target.dataset.rappel;
    if (action === "export") surExport();
    if (action === "valorisation") {
      afficherVue("placements");
      const compteId = e.target.dataset.compte;
      if (compteId) document.getElementById("valo-compte").value = compteId;
    }
  });
}
