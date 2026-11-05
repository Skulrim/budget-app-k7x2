// Réglages des catégories : ajout, recherche, suppression.

import { creerIdCategorie, iconeCategorie, trouverCategorieSimilaire } from "../noyau/categories.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { echapper, normaliser } from "../noyau/outils.js";
import { rafraichir } from "../rendu.js";
import { supprimerAvecAnnulation } from "./notifications.js";
import { remplirChoixBudget, remplirChoixCategories } from "./selecteurs.js";

function verifierNouvelleCategorie() {
  const nom = document.getElementById("categorie-nom").value;
  const sens = document.getElementById("categorie-sens").value;
  const portee = document.getElementById("categorie-portee").value;
  const message = document.getElementById("message-categorie");
  const { exacte, proches } = trouverCategorieSimilaire(nom, sens, portee);
  if (exacte) {
    message.textContent = "« " + exacte.nom + " » existe déjà.";
  } else if (proches.length > 0) {
    message.textContent = "Proche : " + proches.map(c => c.nom).join(", ")
      + ". Vérifie que ce n'est pas la même.";
  } else {
    message.textContent = "";
  }
}

function creerCategorie() {
  const nom = document.getElementById("categorie-nom").value.trim();
  const sens = document.getElementById("categorie-sens").value;
  const portee = document.getElementById("categorie-portee").value;
  const message = document.getElementById("message-categorie");
  if (nom === "") {
    message.textContent = "Donne un nom à la catégorie";
    return;
  }
   const { exacte } = trouverCategorieSimilaire(nom, sens, portee);
  if (exacte) {
    message.textContent = "« " + exacte.nom + " » existe déjà.";
    return;
  }
    const icone = document.getElementById("categorie-icone").value.trim().slice(0, 12);
  const nouvelle = { id: creerIdCategorie(nom), nom: nom, sens: sens, portee: portee };
  if (icone) nouvelle.icone = icone;
  etat.categories.push(nouvelle);
  document.getElementById("categorie-icone").value = "";
  message.textContent = "Catégorie ajoutée";
  document.getElementById("categorie-nom").value = "";
  sauvegarder();
  remplirChoixCategories();
  remplirChoixBudget();
  rafraichir();
}

export function afficherCategories() {
  const zone = document.getElementById("liste-categories");
  const recherche = normaliser(document.getElementById("recherche-categorie").value);
  const NOMS_PORTEE = { perso: "Perso", commun: "Commun", tous: "Perso et commun" };
  document.getElementById("resume-categories").textContent =
    "Mes catégories (" + etat.categories.length + ")";
  const triees = [...etat.categories]
    .filter(c => normaliser(c.nom).includes(recherche))
    .sort((a, b) => a.sens.localeCompare(b.sens) || a.nom.localeCompare(b.nom, "fr"));
  if (triees.length === 0) {
    zone.innerHTML = `<div class="mu">Aucune catégorie trouvée</div>`;
    return;
  }
  zone.innerHTML = triees.map(c => `
    <div class="op">
      <div>${iconeCategorie(c.id)} ${echapper(c.nom)}<small>${c.sens === "revenu" ? "Revenu" : "Dépense"} · ${NOMS_PORTEE[c.portee] || c.portee}</small></div>
      <button class="supprimer" data-cat="${echapper(c.id)}" aria-label="Supprimer la catégorie">✕</button>
    </div>`).join("");
}

function supprimerCategorie(e) {
  const id = e.target.dataset.cat;
  if (!id) return;
  const message = document.getElementById("message-categorie-liste");
  const utilisee = etat.operations.some(o => o.categorie === id)
    || etat.budgets.some(b => b.categorie === id)
    || etat.recurrentes.some(r => r.categorie === id);
  if (utilisee) {
    message.textContent = "Cette catégorie est utilisée (opérations ou budget) : retire d'abord le budget, elle ne peut pas être supprimée si des opérations l'utilisent.";
    return;
  }
  message.textContent = "";
  supprimerAvecAnnulation("Catégorie supprimée", () => {
    etat.categories = etat.categories.filter(c => c.id !== id);
  });
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initCategories() {
  document.getElementById("categorie-nom").addEventListener("input", verifierNouvelleCategorie);
  document.getElementById("categorie-sens").addEventListener("change", verifierNouvelleCategorie);
  document.getElementById("categorie-portee").addEventListener("change", verifierNouvelleCategorie);
  document.getElementById("recherche-categorie").addEventListener("input", afficherCategories);
  document.getElementById("bouton-categorie").addEventListener("click", creerCategorie);
  document.getElementById("liste-categories").addEventListener("click", supprimerCategorie);
}
