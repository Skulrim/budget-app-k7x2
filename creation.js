// Petite fenêtre « Nouveau budget / plan d'épargne / objectif », ouverte depuis les onglets.

import { comptesActifs, estPlacement } from "../noyau/comptes.js";
import { etat } from "../noyau/etat.js";
import { echapper } from "../noyau/outils.js";
import { ajouterBudget } from "./budgets.js";
import { ajouterObjectif, ajouterPlan } from "./epargne.js";
import { montrerNotif } from "./notifications.js";

const TITRES = { budget: "Nouveau budget", plan: "Nouveau plan d'épargne", objectif: "Nouvel objectif d'achat" };
let genre = null;  // "budget", "plan" ou "objectif"
let detail = "";   // portée du budget (perso/commun) ou type de compte du plan (livret/placement)

// Catégories de dépense de la portée qui n'ont pas encore de budget
export function remplirCategoriesBudget() {
  const liste = document.getElementById("creation-budget-categorie");
  const portee = document.getElementById("creation-budget").dataset.portee;
  const libres = etat.categories.filter(c => c.sens === "depense"
    && (c.portee === portee || c.portee === "tous")
    && !etat.budgets.some(b => b.portee === portee && b.categorie === c.id));
  liste.innerHTML = (libres.length ? "" : `<option value="" disabled selected>Toutes ont déjà un budget</option>`)
    + libres.map(c => `<option value="${echapper(c.id)}">${echapper(c.nom)}</option>`).join("")
    + `<option value="">➕ Créer une catégorie…</option>`;
}

function remplirComptesPlan() {
  const comptes = comptesActifs().filter(c => detail === "livret" ? c.type === "livret" : estPlacement(c));
  document.getElementById("creation-plan-compte").innerHTML =
    comptes.map(c => `<option value="${c.id}">${echapper(c.nom)}</option>`).join("");
}

function ouvrir(demande) {
  const morceaux = demande.split(":");
  genre = morceaux[0];
  detail = morceaux[1] || "";
  document.getElementById("creation-titre").textContent = TITRES[genre];
  for (const g of Object.keys(TITRES)) document.getElementById("creation-" + g).hidden = (g !== genre);
  for (const id of ["creation-budget-montant", "creation-plan-montant", "creation-objectif-nom", "creation-objectif-cible"]) {
    document.getElementById(id).value = "";
  }
  document.getElementById("creation-message").textContent = "";
  if (genre === "budget") {
    document.getElementById("creation-budget").dataset.portee = detail;
    remplirCategoriesBudget();
  }
  if (genre === "plan") remplirComptesPlan();
  document.getElementById("panneau-creation").hidden = false;
}

function fermer() {
  document.getElementById("panneau-creation").hidden = true;
}

function valider() {
  let r;
  if (genre === "budget") {
    r = ajouterBudget(
      document.getElementById("creation-budget").dataset.portee,
      document.getElementById("creation-budget-categorie").value,
      document.getElementById("creation-budget-montant").value);
  } else if (genre === "plan") {
    r = ajouterPlan(
      document.getElementById("creation-plan-compte").value,
      document.getElementById("creation-plan-montant").value);
  } else {
    r = ajouterObjectif(
      document.getElementById("creation-objectif-nom").value,
      document.getElementById("creation-objectif-cible").value);
  }
  if (r.ok) {
    fermer();
    montrerNotif(r.message);
  } else {
    document.getElementById("creation-message").textContent = r.message;
  }
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initCreation() {
  document.addEventListener("click", (e) => {
    const bouton = e.target.closest("[data-creer]");
    if (bouton) ouvrir(bouton.dataset.creer);
  });
  document.getElementById("creation-valider").addEventListener("click", valider);
  document.getElementById("creation-annuler").addEventListener("click", fermer);
  document.getElementById("panneau-creation").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) fermer();
  });
}