// Accueil : deux cartes « Prévision de fin de mois » (compte commun, comptes perso)
// + fenêtre qui détaille le calcul quand on touche une carte (avec exclusion de lignes pour le mois).

import { iconeCategorie, nomCategorie } from "../noyau/categories.js";
import { joursRestants, moisCourant } from "../noyau/dates.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { centimesVersEuros, echapper } from "../noyau/outils.js";
import { calculerPrevision } from "../noyau/prevision.js";
import { rafraichir } from "../rendu.js";

const CIRCONFERENCE = 2 * Math.PI * 40;

function ligneLegende(numero, nom, montant, denominateur, signe) {
  const pct = denominateur > 0 ? Math.round(montant / denominateur * 100) : 0;
  return `
    <div class="legende-ligne">
      <i class="point pt${numero}"></i><span>${nom}</span>
      <span class="mu-droite">${pct} %</span>
      <strong>${signe}${centimesVersEuros(montant)}</strong>
    </div>`;
}

function textePeriode() {
  const n = joursRestants();
  return n === 0 ? "dernier jour du mois" : n + (n > 1 ? " jours restants" : " jour restant");
}

// ===== Fenêtre « comment ça se calcule » =====

// Une ligne du calcul. Avec une clé, elle a un bouton : ✕ exclut ce mois, ↺ remet dans le calcul.
function ligneD(texte, montantTexte, cle, exclu) {
  const bouton = cle
    ? `<button type="button" class="supprimer" data-excl="${echapper(cle)}" aria-label="${exclu ? "Remettre dans le calcul" : "Exclure pour ce mois"}">${exclu ? "↺" : "✕"}</button>`
    : "";
  return `<div class="ligne${exclu ? " exclu" : ""}"><span class="txt">${texte}</span>`
    + `<span><span class="txt">${montantTexte}</span>${bouton}</span></div>`;
}

function titreSection(texte) {
  return `<div class="ligne groupe">${texte}</div>`;
}

function nomEtIcone(categorie) {
  return iconeCategorie(categorie) + " " + nomCategorie(categorie);
}

function contenuPanneau(p, portee) {
  const d = p.detail;
  let h = `<h2>${portee === "commun" ? "Compte commun" : "Mes comptes perso"}</h2>`;
  h += ligneD("Solde aujourd'hui", centimesVersEuros(p.solde));
  if (d.revenus.length > 0) {
    h += titreSection("+ Revenus à venir");
    for (const r of d.revenus) h += ligneD(nomEtIcone(r.categorie), centimesVersEuros(r.montant), r.cle, r.exclu);
  }
  if (d.virements.length > 0) {
    h += titreSection("± Virements récurrents");
    for (const v of d.virements) {
      h += ligneD(echapper(v.depuis) + " → " + echapper(v.vers),
        (v.entree ? "+ " : "− ") + centimesVersEuros(v.montant), v.cle, v.exclu);
    }
  }
  if (d.depenses.length > 0) {
    h += titreSection("− Dépenses récurrentes");
    for (const x of d.depenses) h += ligneD(nomEtIcone(x.categorie), centimesVersEuros(x.montant), x.cle, x.exclu);
  }
  if (d.budgets.length > 0) {
    h += titreSection("− Budgets restants");
    for (const b of d.budgets) {
      let expl = "Plafond " + centimesVersEuros(b.plafond) + " − dépensé " + centimesVersEuros(b.depense);
      if (b.rec > 0) expl += " − récurrent déjà compté " + centimesVersEuros(b.rec);
      h += ligneD(nomEtIcone(b.categorie) + `<small class="variation">${expl}</small>`,
        centimesVersEuros(b.montant), b.cle, b.exclu);
    }
  }
  h += `<div class="ligne total"><strong>= Trésorerie prévue</strong><strong>${centimesVersEuros(p.prevu)}</strong></div>`;
  h += `<div class="mu">✕ retire une ligne du calcul pour ce mois seulement (rien n'est supprimé). ↺ la remet.</div>`;
  return h;
}

// Exclut (ou réintègre) une ligne pour le mois en cours
function basculerExclusion(cle) {
  const mois = moisCourant();
  // on en profite pour oublier les exclusions des mois passés
  const liste = (etat.exclusions || []).filter(x => x.mois === mois);
  const i = liste.findIndex(x => x.cle === cle);
  if (i === -1) liste.push({ cle: cle, mois: mois });
  else liste.splice(i, 1);
  etat.exclusions = liste;
  sauvegarder();
}

// ===== Cartes =====

function dessinerPrevision(portee, idZone, vide) {
  const zone = document.getElementById(idZone);
  const p = calculerPrevision(portee);
  if (!p.aDesComptes) {
    zone.innerHTML = `<div class="mu prev-corps">${vide}</div>`;
    return;
  }
  const date = new Date(p.fin + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const trait = p.ratioBudgets * CIRCONFERENCE;
  const negatif = p.prevu < 0;

  // L'argent disponible d'ici fin de mois : solde + revenus + virements qui arrivent
  const entrees = Math.max(0, p.virements);
  const base = p.solde + p.revenus + entrees;
  const tranches = [
    { num: 3, nom: "Dépenses récurrentes", montant: p.depenses },
    { num: 4, nom: "Virements récurrents", montant: Math.max(0, -p.virements) },
    { num: 2, nom: "Budgets restants", montant: p.budgets }
  ].filter(t => t.montant > 0);
  const couts = tranches.reduce((s, t) => s + t.montant, 0);
  // Si l'argent ne suffit pas, la barre est remplie par les seules dépenses (pas de part « reste »)
  const denominateur = negatif ? couts : base;

  let barre = tranches.map(t =>
    `<i class="pt${t.num}" style="width:${denominateur > 0 ? (t.montant / denominateur * 100).toFixed(1) : 0}%"></i>`).join("");
  if (!negatif && p.prevu > 0 && base > 0) {
    barre += `<i class="pt1" style="width:${(p.prevu / base * 100).toFixed(1)}%"></i>`;
  }

  let legende = tranches.map(t => ligneLegende(t.num, t.nom, t.montant, denominateur, "− ")).join("");
  if (!negatif && p.prevu > 0 && base > 0) legende += ligneLegende(1, "Reste prévu", p.prevu, base, "");

  let origine = centimesVersEuros(p.solde) + " aujourd'hui";
  if (p.revenus > 0) origine += " + " + centimesVersEuros(p.revenus) + " de revenus";
  if (entrees > 0) origine += " + " + centimesVersEuros(entrees) + " de virements";

  // Toute la carte est cliquable (data-prev) : elle ouvre la fenêtre du calcul
  zone.innerHTML = `
    <div class="cliquable" data-prev="${portee}">
      <div class="hero prev-hero${negatif ? " negatif" : ""}">
        <div class="prev-anneau">
          <svg viewBox="0 0 96 96" aria-hidden="true">
            <circle class="piste" cx="48" cy="48" r="40" fill="none" stroke-width="9"/>
            <circle class="trait" cx="48" cy="48" r="40" fill="none" stroke-width="9"
              stroke-linecap="round" stroke-dasharray="${trait} ${CIRCONFERENCE}"
              data-trait="${trait}" data-circ="${CIRCONFERENCE}"/>
          </svg>
          <div class="prev-anneau-texte"><b>${Math.round(p.ratioBudgets * 100)} %</b><small>budgets</small></div>
        </div>
        <div>
          <div class="petit">Trésorerie prévue le ${date}</div>
          <div class="prev-montant">${centimesVersEuros(p.prevu)}</div>
          <span class="pastille-etat${negatif ? " alerte" : ""}">${negatif ? "Découvert prévu" : "Dans le vert"}</span>
          <small class="mu-droite"> ${textePeriode()}</small>
        </div>
      </div>
      <div class="prev-corps">
        <div class="prev-barre">${barre}</div>
        <div class="mu">Où va l'argent d'ici fin de mois (${origine})</div>
        <div class="legende">${legende}</div>
        ${negatif ? `<small class="variation hausse">Il manque ${centimesVersEuros(-p.prevu)} pour couvrir les dépenses prévues.</small>` : ""}
        <div class="mu">Hypothèse prudente : tu dépenses jusqu'au plafond de chaque budget. Les catégories sans budget ne sont pas estimées. Touche la carte pour voir le détail du calcul.</div>
      </div>
    </div>`;
}

export function afficherPrevision() {
  dessinerPrevision("commun", "carte-prevision-commun", "Ajoute un compte courant commun pour obtenir une prévision.");
  dessinerPrevision("perso", "carte-prevision-perso", "Ajoute un compte courant perso pour obtenir une prévision.");
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initPrevision() {
  let porteeOuverte = null;
  const ouvrir = (portee) => {
    porteeOuverte = portee;
    document.getElementById("contenu-prevision").innerHTML =
      contenuPanneau(calculerPrevision(portee), portee);
    document.getElementById("panneau-prevision").hidden = false;
  };
  for (const id of ["carte-prevision-commun", "carte-prevision-perso"]) {
    document.getElementById(id).addEventListener("click", (e) => {
      const cible = e.target.closest("[data-prev]");
      if (cible) ouvrir(cible.dataset.prev);
    });
  }
  // ✕ / ↺ : on enregistre, on redessine les cartes, puis on réaffiche la fenêtre à jour
  document.getElementById("contenu-prevision").addEventListener("click", (e) => {
    const bouton = e.target.closest("[data-excl]");
    if (!bouton || !porteeOuverte) return;
    basculerExclusion(bouton.dataset.excl);
    rafraichir();
    ouvrir(porteeOuverte);
  });
  const fermer = () => { document.getElementById("panneau-prevision").hidden = true; };
  document.getElementById("fermer-prevision").addEventListener("click", fermer);
  document.getElementById("panneau-prevision").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) fermer();
  });
}