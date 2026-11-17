// Écran « Mouvements » : filtres, recherche, détail d'un budget.

import { moisCourant, nomMois } from "../noyau/dates.js";
import { etat } from "../noyau/etat.js";
import { budgetSuggere, entreesPour, historiqueCategorie, moisAvecMouvements, texteRecherche } from "../noyau/operations.js";
import { centimesVersEuros, echapper, eurosRonds, ligneMontant, normaliser, somme } from "../noyau/outils.js";
import { afficherVue, retourner } from "./navigation.js";
import { ligneOperation, ligneVirement, supprimerOperation } from "./operations.js";
import { cliquerEdition } from "./saisie.js";

const mouvements = { portee: "perso", categorie: "", mois: "tous" };

export function remplirFiltresMouvements() {
  const m = mouvements;
  const selMois = document.getElementById("mouvements-mois");
  selMois.innerHTML = moisAvecMouvements(m.portee)
    .map(x => `<option value="${x}">${nomMois(x)}</option>`).join("")
    + `<option value="tous">Tous les mois</option>`;
  selMois.value = m.mois;
  const selCat = document.getElementById("mouvements-categorie");
  let html = `<option value="">Toutes les catégories</option>`
    + `<option value="__virements">Virements seulement</option>`;
  for (const c of etat.categories.filter(c => c.portee === m.portee || c.portee === "tous")) {
    html += `<option value="${echapper(c.id)}">${echapper(c.nom)}${c.sens === "revenu" ? " (revenu)" : ""}</option>`;
  }
  selCat.innerHTML = html;
  selCat.value = m.categorie;
}

// Fiche d'une catégorie de dépense : stats de la période, historique 6 mois, budget suggéré
function afficherFiche(actif, depenses) {
  const zone = document.getElementById("fiche-categorie");
  const m = mouvements;
  const cat = etat.categories.find(c => c.id === m.categorie);
  if (!actif || !cat || cat.sens !== "depense") {
    zone.innerHTML = "";
    return;
  }
  const nb = depenses.length;
  const moyenne = nb > 0 ? Math.round(somme(depenses) / nb) : 0;
  const maxi = nb > 0 ? Math.max(...depenses.map(o => o.montant)) : 0;
  const periode = m.mois === "tous" ? "tous les mois" : nomMois(m.mois);

  const serie = historiqueCategorie(m.portee, m.categorie);
  const haut = Math.max(...serie.map(p => p.total));
  const courant = moisCourant();
  const colonnes = serie.map(p => {
    const hauteur = p.total > 0 ? Math.max(4, Math.round(p.total / haut * 100)) : 0;
    const [a, mm] = p.mois.split("-").map(Number);
    const nom = new Date(a, mm - 1, 1).toLocaleDateString("fr-FR", { month: "short" });
    return `
      <div class="histo-col${p.mois === courant ? " courant" : ""}">
        <small class="histo-val">${p.total > 0 ? eurosRonds(p.total) : "—"}</small>
        <div class="histo-zone"><div class="histo-barre" style="height:${hauteur}%"></div></div>
        <small class="histo-mois">${echapper(nom)}</small>
      </div>`;
  }).join("");

  const suggere = budgetSuggere(m.portee, m.categorie);
  const budget = etat.budgets.find(b => b.portee === m.portee && b.categorie === m.categorie);
  const blocSuggere = suggere !== null
    ? `<div class="ligne"><span>Budget suggéré</span><strong>${centimesVersEuros(suggere)}</strong></div>
       <div class="mu">Moyenne de tes derniers mois complets${budget ? " · budget actuel : " + centimesVersEuros(budget.montant) : " · aucun budget pour l'instant"}</div>`
    : `<div class="mu">Budget suggéré dès qu'un mois complet de dépenses existe.</div>`;

  zone.innerHTML = `
    <div class="mu">Statistiques · ${echapper(periode)}</div>
    <div class="ligne"><span>Transactions</span><strong>${nb}</strong></div>
    ${ligneMontant("Moyenne", moyenne)}
    ${ligneMontant("Maximum", maxi)}
    <div class="mu">6 derniers mois</div>
    ${haut > 0 ? `<div class="histo">${colonnes}</div>` : `<div class="mu">Aucune dépense sur 6 mois.</div>`}
    ${blocSuggere}`;
}
export function afficherMouvements() {
  const m = mouvements;
  const recherche = normaliser(document.getElementById("mouvements-recherche").value);
  let entrees = entreesPour(m.portee);
  if (m.mois !== "tous") entrees = entrees.filter(e => e.date.startsWith(m.mois));
  if (m.categorie === "__virements") {
    entrees = entrees.filter(e => e.type === "virement");
  } else if (m.categorie) {
    entrees = entrees.filter(e => e.type === "op" && e.donnee.categorie === m.categorie);
  }
  if (recherche) entrees = entrees.filter(e => texteRecherche(e).includes(recherche));

  const ops = entrees.filter(e => e.type === "op").map(e => e.donnee);
  const depenses = somme(ops.filter(o => o.sens === "depense"));
  const revenus = somme(ops.filter(o => o.sens === "revenu"));
  let resume = `<div class="mu">${entrees.length} mouvement${entrees.length > 1 ? "s" : ""}</div>`
    + ligneMontant("Dépenses", depenses) + ligneMontant("Revenus", revenus);
  const budget = (m.categorie && m.categorie !== "__virements" && m.mois !== "tous" && !recherche)
    ? etat.budgets.find(b => b.portee === m.portee && b.categorie === m.categorie) : null;
  if (budget) {
    const ratio = depenses / budget.montant;
    const pct = Math.min(100, Math.round(ratio * 100));
    resume += `
      <div class="ligne"><span>Plafond du mois</span><strong>${centimesVersEuros(budget.montant)}</strong></div>
      <div class="jauge"><div class="jauge-remplie ${ratio > 1 ? "alerte" : ""}" style="width:${pct}%"></div></div>`;
  }
  document.getElementById("mouvements-total").innerHTML = resume;
    afficherFiche(Boolean(m.categorie) && m.categorie !== "__virements" && !recherche,
    ops.filter(o => o.sens === "depense"));

  const zone = document.getElementById("liste-mouvements");
  if (entrees.length === 0) {
    zone.innerHTML = `<div class="mu">Aucun mouvement.</div>`;
    return;
  }
  zone.innerHTML = entrees.slice(0, 100)
    .map(e => e.type === "op" ? ligneOperation(e.donnee) : ligneVirement(e.donnee))
    .join("")
    + (entrees.length > 100
      ? `<div class="mu">100 premiers affichés sur ${entrees.length} : affine avec la recherche.</div>` : "");
}

function ouvrirMouvements(portee, categorie = "", mois = "tous") {
  Object.assign(mouvements, { portee: portee, categorie: categorie, mois: mois });
  document.getElementById("mouvements-recherche").value = "";
  document.getElementById("titre-mouvements").textContent =
    portee === "commun" ? "Mouvements du commun" : "Mes mouvements";
  afficherVue("mouvements");
  remplirFiltresMouvements();
  afficherMouvements();
}

export function cliquerBudget(e) {
  if (e.target.closest("button")) return;
  const carte = e.target.closest("[data-detail]");
  if (!carte) return;
  const [portee, categorie] = carte.dataset.detail.split(":");
  ouvrirMouvements(portee, categorie, moisCourant());
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initMouvements() {
  document.addEventListener("click", (e) => {
    const bouton = e.target.closest("[data-mouvements]");
    if (bouton) ouvrirMouvements(bouton.dataset.mouvements, "", moisCourant());
  });
  document.getElementById("liste-mouvements").addEventListener("click", supprimerOperation);
  document.getElementById("liste-mouvements").addEventListener("click", cliquerEdition);
  document.getElementById("mouvements-mois").addEventListener("change", (e) => {
    mouvements.mois = e.target.value;
    afficherMouvements();
  });
  document.getElementById("mouvements-categorie").addEventListener("change", (e) => {
    mouvements.categorie = e.target.value;
    afficherMouvements();
  });
  document.getElementById("mouvements-recherche").addEventListener("input", afficherMouvements);
  document.getElementById("fermer-mouvements").addEventListener("click", () => retourner());
}
