// Panneau « + » : saisie et modification d'opérations et de virements.

import { aujourdhui, dateValide } from "../noyau/dates.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { eurosVersCentimes } from "../noyau/outils.js";
import { rafraichir } from "../rendu.js";
import { montrerNotif } from "./notifications.js";
import { remplirChoixCategories } from "./selecteurs.js";

// État partagé du panneau « + » : quel élément est en cours de modification ?
// (un objet, car un module ne peut pas réaffecter une variable importée)
export const edition = { operation: null, virement: null, recurrence: null };

function ajouterVirement() {
  const montant = eurosVersCentimes(document.getElementById("virement-montant").value);
  const date = document.getElementById("date-virement").value;
  const depuis = document.getElementById("virement-depuis").value;
  const vers = document.getElementById("virement-vers").value;
  const message = document.getElementById("message-virement");
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  if (!dateValide(date)) {
    message.textContent = "Date invalide (pas dans le futur)";
    return;
  }
  if (depuis === vers) {
    message.textContent = "Choisis deux comptes différents";
    return;
  }
  message.textContent = "";
  const champs = {
    depuisId: depuis,
    versId: vers,
    montant: montant,
    date: date,
    note: document.getElementById("note-virement").value.trim().slice(0, 80)
  };
  if (edition.virement) {
    const v = etat.virements.find(x => x.id === edition.virement);
    if (v) Object.assign(v, champs);
  } else {
    etat.virements.push({ id: "v" + Date.now(), ...champs });
  }
  marquerRecurrenceTraitee();
  edition.virement = null;
  document.getElementById("virement-montant").value = "";
  document.getElementById("panneau-saisie").hidden = true;
  sauvegarder();
  rafraichir();
}

function ouvrirEditionVirement(id) {
  const v = etat.virements.find(x => x.id === id);
  if (!v) return;
  const depuis = document.getElementById("virement-depuis");
  const vers = document.getElementById("virement-vers");
  depuis.value = v.depuisId;
  vers.value = v.versId;
  if (depuis.value !== v.depuisId || vers.value !== v.versId) {
    montrerNotif("Un des comptes est archivé : réactive-le pour modifier ce virement.");
    return;
  }
  preparerSaisie();
  edition.virement = id;
  afficherFormulaire("virement");
  document.getElementById("virement-montant").value = (v.montant / 100).toFixed(2).replace(".", ",");
  document.getElementById("date-virement").value = v.date;
  document.getElementById("note-virement").value = v.note || "";
  document.getElementById("bouton-virement").textContent = "Enregistrer la modification";
  document.getElementById("titre-edition").textContent = "Modifier le virement";
  document.getElementById("titre-edition").hidden = false;
  document.getElementById("annuler-edition").hidden = false;
  document.querySelector(".bascule").hidden = true;
  document.getElementById("panneau-saisie").hidden = false;
}

export function preparerSaisie() {
  edition.operation = null;
  edition.virement = null;
  edition.recurrence = null;
  for (const id of ["date-operation", "date-virement"]) {
    const champ = document.getElementById(id);
    champ.value = aujourdhui();
    champ.max = aujourdhui();
  }
  document.getElementById("montant").value = "";
  document.getElementById("virement-montant").value = "";
  document.getElementById("note-operation").value = "";
  document.getElementById("note-virement").value = "";
  document.getElementById("message").textContent = "";
  document.getElementById("message-virement").textContent = "";
  document.getElementById("bouton-ajouter").textContent = "Ajouter";
  document.getElementById("bouton-virement").textContent = "Virer";
  document.getElementById("titre-edition").textContent = "Modifier l'opération";
  document.getElementById("annuler-edition").hidden = true;
  document.getElementById("titre-edition").hidden = true;
  document.querySelector(".bascule").hidden = false;
}

function marquerRecurrenceTraitee() {
  if (!edition.recurrence) return;
  const r = etat.recurrentes.find(x => x.id === edition.recurrence.id);
  if (r && !r.traites.includes(edition.recurrence.mois)) {
    r.traites.push(edition.recurrence.mois);
  }
  edition.recurrence = null;
}

function ajouterOperation() {
  const montant = eurosVersCentimes(document.getElementById("montant").value);
  const date = document.getElementById("date-operation").value;
  const compteId = document.getElementById("choix-compte").value;
  const message = document.getElementById("message");
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  if (!dateValide(date)) {
    message.textContent = "Date invalide (pas dans le futur)";
    return;
  }
  if (!compteId) {
    message.textContent = "Crée d'abord un compte (⚙ Réglages)";
    return;
  }
  message.textContent = "";
  const champs = {
    compteId: compteId,
    sens: document.getElementById("choix-sens").value,
    montant: montant,
    date: date,
    categorie: document.getElementById("choix-categorie").value,
    note: document.getElementById("note-operation").value.trim().slice(0, 80)
  };
  if (edition.operation) {
    const op = etat.operations.find(o => o.id === edition.operation);
    if (op) Object.assign(op, champs);
  } else {
    etat.operations.push({ id: "o" + Date.now(), ...champs });
  }
  marquerRecurrenceTraitee();
  edition.operation = null;
  document.getElementById("montant").value = "";
  document.getElementById("panneau-saisie").hidden = true;
  sauvegarder();
  rafraichir();
}

function ouvrirEdition(id) {
  const op = etat.operations.find(o => o.id === id);
  if (!op) return;
  const choixCompte = document.getElementById("choix-compte");
  choixCompte.value = op.compteId;
  if (choixCompte.value !== op.compteId) {
    montrerNotif("Ce compte est archivé : réactive-le pour modifier cette opération.");
    return;
  }
  preparerSaisie();
  edition.operation = id;
  afficherFormulaire("operation");
  document.getElementById("montant").value = (op.montant / 100).toFixed(2).replace(".", ",");
  document.getElementById("date-operation").value = op.date;
  document.getElementById("choix-sens").value = op.sens;
  remplirChoixCategories();
  document.getElementById("choix-categorie").value = op.categorie;
  document.getElementById("note-operation").value = op.note || "";
  document.getElementById("bouton-ajouter").textContent = "Enregistrer la modification";
  document.getElementById("annuler-edition").hidden = false;
  document.getElementById("titre-edition").hidden = false;
  document.querySelector(".bascule").hidden = true;
  document.getElementById("panneau-saisie").hidden = false;
}

export function cliquerEdition(e) {
  const op = e.target.closest("[data-edit]");
  if (op) {
    ouvrirEdition(op.dataset.edit);
    return;
  }
  const vir = e.target.closest("[data-edit-virement]");
  if (vir) ouvrirEditionVirement(vir.dataset.editVirement);
}

export function afficherFormulaire(nom) {
  document.getElementById("formulaire-operation").hidden = (nom !== "operation");
  document.getElementById("formulaire-virement").hidden = (nom !== "virement");
  document.getElementById("onglet-operation").classList.toggle("actif", nom === "operation");
  document.getElementById("onglet-virement").classList.toggle("actif", nom === "virement");
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initSaisie() {
  document.getElementById("annuler-edition").addEventListener("click", () => {
    document.getElementById("panneau-saisie").hidden = true;
    preparerSaisie();
  });
  document.getElementById("bouton-plus").addEventListener("click", () => {
    preparerSaisie();
    afficherFormulaire("operation");
    document.getElementById("panneau-saisie").hidden = false;
  });
  document.getElementById("fermer-saisie").addEventListener("click", () => {
    document.getElementById("panneau-saisie").hidden = true;
    preparerSaisie();
  });
  document.getElementById("panneau-saisie").addEventListener("click", (e) => {
    if (e.target !== e.currentTarget) return;
    document.getElementById("panneau-saisie").hidden = true;
    preparerSaisie();
  });
  document.getElementById("onglet-operation").addEventListener("click", () => afficherFormulaire("operation"));
  document.getElementById("onglet-virement").addEventListener("click", () => afficherFormulaire("virement"));
  document.getElementById("bouton-ajouter").addEventListener("click", ajouterOperation);
  document.getElementById("bouton-virement").addEventListener("click", ajouterVirement);
}
