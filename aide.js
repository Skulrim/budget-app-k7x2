// Aide au premier lancement : 3 écrans, on crée comptes et budgets directement dedans.

import { TYPES_PLACEMENT } from "../noyau/comptes.js";
import { etat } from "../noyau/etat.js";
import { echapper } from "../noyau/outils.js";
import { ajouterBudget } from "./budgets.js";
import { ajouterCompte } from "./comptes.js";

const CLE = "budget-aide-vue";

const ECRANS = [
  {
    titre: "1/3 · Tes comptes",
    texte: "Crée tes comptes : un compte courant perso, le compte commun, tes livrets… Tu peux en ajouter autant que tu veux, puis passer à la suite.",
    formulaire: "compte"
  },
  {
    titre: "2/3 · Tes budgets",
    texte: "Un budget fixe un plafond par mois pour une catégorie (courses, loisirs…). Les catégories courantes existent déjà. Ajoutes-en autant que tu veux.",
    formulaire: "budget"
  },
  {
    titre: "3/3 · Au quotidien",
    texte: "Le bouton + sert à noter une dépense, un revenu ou un virement. Pour un loyer ou un abonnement, choisis « Répéter cette opération » : l'appli te le proposera sur l'Accueil, dans « À valider ».",
    formulaire: null
  }
];

let index = 0;

function dejaVue() {
  try { return localStorage.getItem(CLE) === "1"; } catch (e) { return false; }
}

function marquerVue() {
  try { localStorage.setItem(CLE, "1"); } catch (e) {}
}

function formulaireCompte() {
  return `
    <details class="repliable" open>
      <summary>➕ Créer un compte</summary>
      <div class="saisie">
        <input id="aide-compte-nom" type="text" placeholder="Nom (ex : Livret A)">
        <select id="aide-compte-type">
          <option value="courant">Courant</option>
          <option value="livret">Livret</option>
          <option value="pea">PEA</option>
          <option value="assurance-vie">Assurance vie</option>
        </select>
        <select id="aide-compte-proprio">
          <option value="perso">Perso</option>
          <option value="commun">Commun</option>
        </select>
        <input id="aide-compte-solde" type="text" inputmode="decimal" placeholder="Solde de départ (ex : 1200)">
        <input id="aide-compte-verse" type="text" inputmode="decimal" placeholder="Total déjà versé (ex : 10000)" hidden>
        <button type="button" data-aide-creer="compte">Créer ce compte</button>
        <p id="aide-message"></p>
      </div>
    </details>`;
}

function formulaireBudget() {
  return `
    <details class="repliable" open>
      <summary>➕ Créer un budget</summary>
      <div class="saisie">
        <select id="aide-budget-portee">
          <option value="perso">Perso</option>
          <option value="commun">Commun</option>
        </select>
        <select id="aide-budget-categorie"></select>
        <input id="aide-budget-montant" type="text" inputmode="decimal" placeholder="Montant par mois (ex : 250)">
        <button type="button" data-aide-creer="budget">Créer ce budget</button>
        <p id="aide-message"></p>
      </div>
    </details>`;
}

// Catégories de dépense de la portée choisie qui n'ont pas encore de budget
function remplirCategoriesAide() {
  const portee = document.getElementById("aide-budget-portee").value;
  const libres = etat.categories.filter(c => c.sens === "depense"
    && (c.portee === portee || c.portee === "tous")
    && !etat.budgets.some(b => b.portee === portee && b.categorie === c.id));
  document.getElementById("aide-budget-categorie").innerHTML = libres.length
    ? libres.map(c => `<option value="${echapper(c.id)}">${echapper(c.nom)}</option>`).join("")
    : `<option value="" disabled selected>Toutes ont déjà un budget</option>`;
}

// Remet la fenêtre en haut (sinon elle garde la position de l'écran précédent)
function remonter() {
  document.querySelector("#panneau-aide .panneau-contenu").scrollTop = 0;
}

function afficher() {
  const e = ECRANS[index];
  document.getElementById("aide-contenu").innerHTML = `
    <div class="moyen">${e.titre}</div>
    <p>${e.texte}</p>
    ${e.formulaire === "compte" ? formulaireCompte() : ""}
    ${e.formulaire === "budget" ? formulaireBudget() : ""}`;
  if (e.formulaire === "budget") remplirCategoriesAide();
  document.getElementById("aide-precedent").hidden = (index === 0);
  document.getElementById("aide-suivant").textContent =
    index === ECRANS.length - 1 ? "Terminer" : "Suivant";
  remonter();
}

function ouvrir() {
  index = 0;
  document.getElementById("panneau-aide").hidden = false;
  afficher(); // après l'affichage de la fenêtre : sinon le retour en haut peut être ignoré
}

function fermer() {
  marquerVue();
  document.getElementById("panneau-aide").hidden = true;
}

function creer(genre) {
  const val = id => document.getElementById(id).value;
  const message = document.getElementById("aide-message");
  if (genre === "compte") {
    const nom = val("aide-compte-nom").trim();
    const r = ajouterCompte(nom, val("aide-compte-type"), val("aide-compte-proprio"),
      val("aide-compte-solde"), val("aide-compte-verse"));
    message.textContent = r.ok ? "✓ « " + nom + " » créé. Tu peux en créer un autre." : r.message;
    if (r.ok) {
      for (const id of ["aide-compte-nom", "aide-compte-solde", "aide-compte-verse"]) {
        document.getElementById(id).value = "";
      }
    }
  } else {
    const r = ajouterBudget(val("aide-budget-portee"), val("aide-budget-categorie"),
      val("aide-budget-montant"));
    message.textContent = r.ok ? "✓ Budget créé. Tu peux en créer un autre." : r.message;
    if (r.ok) {
      document.getElementById("aide-budget-montant").value = "";
      remplirCategoriesAide();
    }
  }
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
  const contenu = document.getElementById("aide-contenu");
  contenu.addEventListener("click", (e) => {
    const bouton = e.target.closest("[data-aide-creer]");
    if (bouton) creer(bouton.dataset.aideCreer);
  });
  contenu.addEventListener("change", (e) => {
    if (e.target.id === "aide-compte-type") {
      document.getElementById("aide-compte-verse").hidden =
        !TYPES_PLACEMENT.includes(e.target.value);
    }
    if (e.target.id === "aide-budget-portee") remplirCategoriesAide();
  });
}