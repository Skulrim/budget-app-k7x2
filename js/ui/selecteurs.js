// Remplit les menus déroulants (comptes, catégories, plans…).

import { categoriesPour } from "../noyau/categories.js";
import { comptesActifs, estPlacement } from "../noyau/comptes.js";
import { etat } from "../noyau/etat.js";
import { echapper } from "../noyau/outils.js";

export function remplirChoixComptes() {
  for (const idMenu of ["choix-compte", "virement-depuis", "virement-vers"]) {
    const choix = document.getElementById(idMenu);
    choix.innerHTML = "";
    for (const compte of comptesActifs()) {
      if (idMenu === "choix-compte" && estPlacement(compte)) continue;
      choix.innerHTML += `<option value="${compte.id}">${echapper(compte.nom)}</option>`;
    }
  }
  remplirChoixPlacements();
  remplirChoixPlan();
  remplirChoixRecurrence();
  remplirChoixAjustement();
}

// Comptes dont on peut ajuster le solde : courants et livrets (les placements ont leur propre valorisation)
export function remplirChoixAjustement() {
  const choix = document.getElementById("ajust-compte");
  const memoire = choix.value;
  choix.innerHTML = comptesActifs().filter(c => !estPlacement(c))
    .map(c => `<option value="${c.id}">${echapper(c.nom)}</option>`).join("");
  if (memoire) choix.value = memoire;
}

function remplirChoixPlacements() {
  const choix = document.getElementById("valo-compte");
  choix.innerHTML = "";
  for (const compte of comptesActifs().filter(estPlacement)) {
    choix.innerHTML += `<option value="${compte.id}">${echapper(compte.nom)}</option>`;
  }
}

export function remplirChoixCategories() {
  const compteId = document.getElementById("choix-compte").value;
  const sens = document.getElementById("choix-sens").value;
  const choix = document.getElementById("choix-categorie");
  if (!compteId) {
    choix.innerHTML = "";
    return;
  }
  choix.innerHTML = "";
  for (const cat of categoriesPour(compteId, sens)) {
    choix.innerHTML += `<option value="${cat.id}">${echapper(cat.nom)}</option>`;
  }
}

export function remplirChoixBudget() {
  const portee = document.getElementById("budget-portee").value;
  const choix = document.getElementById("budget-categorie");
  choix.innerHTML = "";
  const liste = etat.categories.filter(c =>
    c.sens === "depense" && (c.portee === portee || c.portee === "tous"));
  for (const c of liste) {
    choix.innerHTML += `<option value="${echapper(c.id)}">${echapper(c.nom)}</option>`;
  }
}

function remplirChoixPlan() {
  const choix = document.getElementById("plan-compte");
  choix.innerHTML = "";
  for (const c of comptesActifs().filter(c => c.type !== "courant")) {
    choix.innerHTML += `<option value="${c.id}">${echapper(c.nom)}</option>`;
  }
}

function remplirChoixRecurrence() {
  const choix = document.getElementById("rec-compte");
  const memoire = choix.value;
  choix.innerHTML = comptesActifs().filter(c => !estPlacement(c))
    .map(c => `<option value="${c.id}">${echapper(c.nom)}</option>`).join("");
  if (memoire) choix.value = memoire;
  for (const idMenu of ["rec-depuis", "rec-vers"]) {
    const menu = document.getElementById(idMenu);
    const sel = menu.value;
    menu.innerHTML = comptesActifs()
      .map(c => `<option value="${c.id}">${echapper(c.nom)}</option>`).join("");
    if (sel) menu.value = sel;
  }
  remplirChoixCategoriesRec();
}

export function remplirChoixCategoriesRec() {
  const compteId = document.getElementById("rec-compte").value;
  const sens = document.getElementById("rec-sens").value;
  const choix = document.getElementById("rec-categorie");
  const memoire = choix.value;
  choix.innerHTML = compteId
    ? categoriesPour(compteId, sens)
        .map(c => `<option value="${echapper(c.id)}">${echapper(c.nom)}</option>`).join("")
    : "";
  if (memoire) choix.value = memoire;
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initSelecteurs() {
  document.getElementById("choix-compte").addEventListener("change", remplirChoixCategories);
  document.getElementById("choix-sens").addEventListener("change", remplirChoixCategories);
  document.getElementById("budget-portee").addEventListener("change", remplirChoixBudget);
  document.getElementById("rec-compte").addEventListener("change", remplirChoixCategoriesRec);
  document.getElementById("rec-sens").addEventListener("change", remplirChoixCategoriesRec);
}
