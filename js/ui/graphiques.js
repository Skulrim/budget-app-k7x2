// Graphiques : anneau des dépenses, courbe d'épargne, histogramme sur 6 mois.

import { iconeCategorie, nomCategorie } from "../noyau/categories.js";
import { moisCourant, moisCourt, moisDecale, moisEntre } from "../noyau/dates.js";
import { serieEpargne } from "../noyau/epargne.js";
import { etat } from "../noyau/etat.js";
import { depensesParCategorie } from "../noyau/operations.js";
import { centimesVersEuros, echapper, eurosRonds, somme } from "../noyau/outils.js";
import { cliquerBudget } from "./mouvements.js";

export function afficherAnneaux() {
  for (const portee of ["perso", "commun"]) {
    const zone = document.getElementById("graphique-" + portee);
    const lignes = depensesParCategorie(portee);
    const total = lignes.reduce((s, l) => s + l.montant, 0);
    if (total === 0) {
      zone.innerHTML = `<div class="mu">Pas encore de dépense ce mois-ci.</div>`;
      continue;
    }
    const parts = lignes.slice(0, 5).map(l => ({ ...l }));
    const reste = lignes.slice(5).reduce((s, l) => s + l.montant, 0);
    if (reste > 0) parts.push({ categorie: null, montant: reste });

    const R = 40;
    const C = 2 * Math.PI * R;
    let cumul = 0;
    let cercles = `<circle class="fond" cx="50" cy="50" r="${R}" fill="none" stroke-width="14"/>`;
    parts.forEach((p, i) => {
      const longueur = p.montant / total * C;
      const num = p.categorie === null ? 6 : i + 1;
      cercles += `<circle class="seg seg${num}" cx="50" cy="50" r="${R}" fill="none"
        stroke-width="14" stroke-dasharray="${longueur} ${C}" stroke-dashoffset="${-cumul}"
        data-trait="${longueur}" data-circ="${C}"/>`;
      cumul += longueur;
    });

    const legende = parts.map((p, i) => {
      const num = p.categorie === null ? 6 : i + 1;
      const pct = Math.round(p.montant / total * 100);
      const nom = p.categorie === null
        ? "Autres" : `${iconeCategorie(p.categorie)} ${nomCategorie(p.categorie)}`;
      const attr = p.categorie === null
        ? "" : ` cliquable" data-detail="${portee}:${echapper(p.categorie)}`;
      return `
        <div class="legende-ligne${attr}">
          <i class="point pt${num}"></i><span>${nom}</span>
          <span class="mu-droite">${pct} %</span>
          <strong>${centimesVersEuros(p.montant)}</strong>
        </div>`;
    }).join("");

    zone.innerHTML = `
      <div class="donut-graph">
        <svg viewBox="0 0 100 100" aria-hidden="true">${cercles}</svg>
        <div class="donut-centre"><small>Dépensé</small><b>${eurosRonds(total)}</b></div>
      </div>
      <div class="legende">${legende}</div>`;
  }
}

export function afficherCourbeEpargne() {
  const zone = document.getElementById("graphique-epargne");
  const serie = serieEpargne();
  if (serie.length < 2) {
    zone.innerHTML = `<div class="mu">La courbe apparaîtra dès que tu auras deux mois d'historique.</div>`;
    return;
  }
  const L = 300, H = 110, marge = 8;
  const valeurs = serie.map(p => p.valeur);
  let min = Math.min(...valeurs);
  let max = Math.max(...valeurs);
  const ecart = (max - min) || Math.max(1, Math.abs(max) * 0.1);
  min -= ecart * 0.15;
  max += ecart * 0.15;
  const x = i => marge + i * (L - 2 * marge) / (serie.length - 1);
  const y = v => H - marge - (v - min) / (max - min) * (H - 2 * marge);
  const points = serie.map((p, i) => x(i).toFixed(1) + "," + y(p.valeur).toFixed(1));
  const ligne = "M" + points.join(" L");
  const aire = ligne + " L" + x(serie.length - 1).toFixed(1) + "," + H
    + " L" + x(0).toFixed(1) + "," + H + " Z";
  const cercles = serie.map((p, i) =>
    `<circle class="courbe-point" cx="${x(i).toFixed(1)}" cy="${y(p.valeur).toFixed(1)}" r="3"/>`).join("");
  const premier = serie[0];
  const dernier = serie[serie.length - 1];
  const delta = dernier.valeur - premier.valeur;
  const signe = delta >= 0 ? "+" : "−";
  zone.innerHTML = `
    <div class="mu">Épargne et placements</div>
    <div class="moyen">${centimesVersEuros(dernier.valeur)}</div>
    <div class="mu">${signe} ${centimesVersEuros(Math.abs(delta))} depuis ${moisCourt(premier.mois)} (versements inclus)</div>
    <svg class="courbe" viewBox="0 0 ${L} ${H}" role="img" aria-label="Évolution de l'épargne">
      <path class="courbe-aire" d="${aire}"/>
      <path class="courbe-ligne" pathLength="1" d="${ligne}"/>
      ${cercles}
    </svg>
    <div class="courbe-axe"><span>${moisCourt(premier.mois)}</span><span>${moisCourt(dernier.mois)}</span></div>`;
}

export function afficherHistogrammeMois() {
  const zone = document.getElementById("graphique-mois");
  const courant = moisCourant();
  const serie = moisEntre(moisDecale(-5), courant).map(m => ({
    mois: m,
    total: somme(etat.operations.filter(o => o.sens === "depense" && o.date.startsWith(m)))
  }));
  const max = Math.max(...serie.map(p => p.total));
  if (max === 0) {
    zone.innerHTML = `<div class="mu">Pas encore de dépenses à comparer.</div>`;
    return;
  }
  const passes = serie.filter(p => p.mois !== courant && p.total > 0);
  const moyenne = passes.length > 0
    ? Math.round(passes.reduce((s, p) => s + p.total, 0) / passes.length) : null;

  const colonnes = serie.map(p => {
    const hauteur = p.total > 0 ? Math.max(4, Math.round(p.total / max * 100)) : 0;
    const [a, m] = p.mois.split("-").map(Number);
    const nom = new Date(a, m - 1, 1).toLocaleDateString("fr-FR", { month: "short" });
    return `
      <div class="histo-col${p.mois === courant ? " courant" : ""}">
        <small class="histo-val">${p.total > 0 ? eurosRonds(p.total) : "—"}</small>
        <div class="histo-zone"><div class="histo-barre" style="height:${hauteur}%"></div></div>
        <small class="histo-mois">${echapper(nom)}</small>
      </div>`;
  }).join("");

  zone.innerHTML = `
    <div class="histo">${colonnes}</div>
    ${moyenne !== null
      ? `<div class="mu">Moyenne des mois précédents : ${centimesVersEuros(moyenne)}. Le mois en cours (en couleur pleine) n'est pas terminé.</div>`
      : `<div class="mu">Le mois en cours (en couleur pleine) n'est pas terminé.</div>`}`;
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initGraphiques() {
  document.getElementById("graphique-perso").addEventListener("click", cliquerBudget);
  document.getElementById("graphique-commun").addEventListener("click", cliquerBudget);
}
