// Lignes d'opérations et de virements, liste des derniers mouvements.

import { iconeCategorie, nomCategorie } from "../noyau/categories.js";
import { etat } from "../noyau/etat.js";
import { entreesPour } from "../noyau/operations.js";
import { centimesVersEuros, echapper } from "../noyau/outils.js";
import { supprimerAvecAnnulation } from "./notifications.js";
import { cliquerEdition } from "./saisie.js";

export function ligneOperation(op) {
  const compte = etat.comptes.find(c => c.id === op.compteId);
  const signe = op.sens === "revenu" ? "+" : "−";
  return `
    <div class="op">
      <i class="pastille cliquable" data-edit="${op.id}">${iconeCategorie(op.categorie)}</i>
      <div class="cliquable" data-edit="${op.id}">${nomCategorie(op.categorie)}<small>${op.date} · ${echapper(compte.nom)}</small>${op.note ? `<small>${echapper(op.note)}</small>` : ""}</div>
      <span class="${op.sens} cliquable" data-edit="${op.id}">${signe} ${centimesVersEuros(op.montant)}</span>
      <button class="supprimer" data-id="${op.id}" data-type="op" aria-label="Supprimer">✕</button>
    </div>`;
}

export function ligneVirement(v) {
  const depuis = etat.comptes.find(c => c.id === v.depuisId);
  const vers = etat.comptes.find(c => c.id === v.versId);
  return `
    <div class="op">
      <i class="pastille cliquable" data-edit-virement="${v.id}">↔️</i>
      <div class="cliquable" data-edit-virement="${v.id}">Virement<small>${v.date} · ${echapper(depuis.nom)} → ${echapper(vers.nom)}</small>${v.note ? `<small>${echapper(v.note)}</small>` : ""}</div>
      <span class="cliquable" data-edit-virement="${v.id}">${centimesVersEuros(v.montant)}</span>
      <button class="supprimer" data-id="${v.id}" data-type="virement" aria-label="Supprimer">✕</button>
    </div>`;
}

export function afficherOperations() {
  for (const portee of ["perso", "commun"]) {
    document.getElementById("liste-operations-" + portee).innerHTML =
      entreesPour(portee).slice(0, 15)
        .map(e => e.type === "op" ? ligneOperation(e.donnee) : ligneVirement(e.donnee))
        .join("");
  }
}

export function supprimerOperation(e) {
  const id = e.target.dataset.id;
  const type = e.target.dataset.type;
  if (!id) return;
  if (type === "virement") {
    supprimerAvecAnnulation("Virement supprimé", () => {
      etat.virements = etat.virements.filter(v => v.id !== id);
    });
  } else {
    supprimerAvecAnnulation("Opération supprimée", () => {
      etat.operations = etat.operations.filter(op => op.id !== id);
    });
  }
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initOperations() {
  document.getElementById("liste-operations-perso").addEventListener("click", cliquerEdition);
  document.getElementById("liste-operations-commun").addEventListener("click", cliquerEdition);
  document.getElementById("liste-operations-perso").addEventListener("click", supprimerOperation);
  document.getElementById("liste-operations-commun").addEventListener("click", supprimerOperation);
}
