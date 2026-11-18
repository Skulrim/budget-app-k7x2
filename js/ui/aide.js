// Aide au premier lancement : 3 écrans, relançable depuis les Réglages.

import { etat } from "../noyau/etat.js";

const CLE = "budget-aide-vue";

// data-reglage ouvre directement le bon bloc des Réglages (géré par navigation.js)
const ECRANS = [
  {
    titre: "1/3 · Tes comptes",
    texte: "Commence par créer tes comptes : un compte courant perso, le compte commun, et tes livrets. Tout le reste de l'appli s'appuie dessus.",
    reglage: "bloc-comptes", bouton: "Créer un compte"
  },
  {
    titre: "2/3 · Tes budgets",
    texte: "Un budget fixe un plafond par mois pour une catégorie (courses, loisirs…). Les catégories courantes existent déjà, et tu peux en créer d'autres au moment de saisir.",
    reglage: "bloc-budgets", bouton: "Créer un budget"
  },
  {
    titre: "3/3 · Au quotidien",
    texte: "Le bouton + sert à noter une dépense, un revenu ou un virement. Pour un loyer ou un abonnement, choisis « Répéter cette opération » : l'appli te le proposera sur l'Accueil, dans « À valider ».",
    reglage: null, bouton: ""
  }
];

let index = 0;

function dejaVue() {
  try { return localStorage.getItem(CLE) === "1"; } catch (e) { return false; }
}

function marquerVue() {
  try { localStorage.setItem(CLE, "1"); } catch (e) {}
}

function afficher() {
  const e = ECRANS[index];
  document.getElementById("aide-contenu").innerHTML = `
    <div class="moyen">${e.titre}</div>
    <p>${e.texte}</p>
    ${e.reglage ? `<button type="button" class="lien-action" data-reglage="${e.reglage}">${e.bouton}</button>` : ""}`;
  document.getElementById("aide-precedent").hidden = (index === 0);
  document.getElementById("aide-suivant").textContent =
    index === ECRANS.length - 1 ? "Terminer" : "Suivant";
}

function ouvrir() {
  index = 0;
  afficher();
  document.getElementById("panneau-aide").hidden = false;
}

function fermer() {
  marquerVue();
  document.getElementById("panneau-aide").hidden = true;
}

// Appelé une fois au démarrage : n'ouvre l'aide que sur un appareil vierge
export function ouvrirAideSiNouveau() {
  if (!dejaVue() && etat.comptes.length === 0) ouvrir();
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initAide() {
  document.getElementById("bouton-aide").addEventListener("click", ouvrir);
  document.getElementById("aide-precedent").addEventListener("click", () => {
    if (index > 0) { index--; afficher(); }
  });
  document.getElementById("aide-suivant").addEventListener("click", () => {
    if (index < ECRANS.length - 1) { index++; afficher(); }
    else fermer();
  });
  document.getElementById("aide-fermer").addEventListener("click", fermer);
  // Un bouton d'action (« Créer un compte »…) ferme l'aide ; navigation.js ouvre les Réglages
  document.getElementById("aide-contenu").addEventListener("click", (e) => {
    if (e.target.closest("[data-reglage]")) fermer();
  });
}