// Création rapide d'une catégorie depuis une liste déroulante, dans une petite fenêtre.

import { creerIdCategorie, trouverCategorieSimilaire } from "../noyau/categories.js";
import { porteeDuCompte } from "../noyau/comptes.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { eurosVersCentimes } from "../noyau/outils.js";
import { rafraichir } from "../rendu.js";
import { montrerNotif } from "./notifications.js";
import { remplirChoixBudget, remplirChoixCategories, remplirChoixCategoriesRec } from "./selecteurs.js";
import { remplirCategoriesBudget } from "./creation.js";

// Liste d'où l'on vient + sens et portée déduits du formulaire
let contexte = null;

function contexteDe(idListe) {
  const portee = (idCompte) => {
    const id = document.getElementById(idCompte).value;
    return id ? porteeDuCompte(id) : "perso";
  };
  if (idListe === "choix-categorie") {
    return { sens: document.getElementById("choix-sens").value, portee: portee("choix-compte"), avecBudget: true };
  }
  if (idListe === "rec-categorie") {
    return { sens: document.getElementById("rec-sens").value, portee: portee("rec-compte"), avecBudget: true };
  }
  if (idListe === "creation-budget-categorie") {
    return { sens: "depense", portee: document.getElementById("creation-budget").dataset.portee, avecBudget: false };
  }
  return { sens: "depense", portee: document.getElementById("budget-portee").value, avecBudget: false };
}

function ouvrir(liste) {
  const c = contexteDe(liste.id);
  contexte = { liste: liste, ...c };
  for (const id of ["nc-nom", "nc-icone", "nc-budget"]) document.getElementById(id).value = "";
  document.getElementById("nc-message").textContent = "";
  document.getElementById("nc-budget").hidden = !(c.avecBudget && c.sens === "depense");
  document.getElementById("info-nouvelle-categorie").textContent =
    (c.sens === "revenu" ? "Revenu" : "Dépense") + " · " + (c.portee === "commun" ? "Commun" : "Perso");
  document.getElementById("panneau-categorie").hidden = false;
}

// Annuler : on remet la liste sur son premier choix (sinon elle resterait sur « Créer… »)
function fermer() {
  document.getElementById("panneau-categorie").hidden = true;
  if (contexte) contexte.liste.selectedIndex = 0;
  contexte = null;
}

function rafraichirListes() {
  remplirChoixCategories();
  remplirChoixBudget();
  remplirChoixCategoriesRec();
  rafraichir();
  remplirCategoriesBudget();
}

function creer() {
  const nom = document.getElementById("nc-nom").value.trim();
  const message = document.getElementById("nc-message");
  if (nom === "") {
    message.textContent = "Donne un nom à la catégorie";
    return;
  }
  const { exacte } = trouverCategorieSimilaire(nom, contexte.sens, contexte.portee);
  if (exacte) {
    const liste = contexte.liste;
    document.getElementById("panneau-categorie").hidden = true;
    contexte = null;
    liste.value = exacte.id;
    montrerNotif("« " + exacte.nom + " » existait déjà : elle est sélectionnée.");
    return;
  }
  let montant = null;
  const champBudget = document.getElementById("nc-budget");
  if (!champBudget.hidden && champBudget.value.trim() !== "") {
    montant = eurosVersCentimes(champBudget.value);
    if (isNaN(montant) || montant <= 0) {
      message.textContent = "Budget invalide";
      return;
    }
  }
  const id = creerIdCategorie(nom);
  const nouvelle = { id: id, nom: nom, sens: contexte.sens, portee: contexte.portee };
  const icone = document.getElementById("nc-icone").value.trim().slice(0, 12);
  if (icone) nouvelle.icone = icone;
  etat.categories.push(nouvelle);
  if (montant !== null) etat.budgets.push({ portee: contexte.portee, categorie: id, montant: montant });
  sauvegarder();
  const liste = contexte.liste;
  document.getElementById("panneau-categorie").hidden = true;
  contexte = null;
  rafraichirListes();
  liste.value = id; // après le rafraîchissement : la nouvelle catégorie est déjà choisie
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initNouvelleCategorie() {
  for (const id of ["choix-categorie", "rec-categorie", "budget-categorie", "creation-budget-categorie"]) {
    const liste = document.getElementById(id);
    liste.addEventListener("change", () => {
      if (liste.value === "") ouvrir(liste);
    });
  }
  document.getElementById("nc-creer").addEventListener("click", creer);
  document.getElementById("nc-annuler").addEventListener("click", fermer);
  document.getElementById("panneau-categorie").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) fermer();
  });
}