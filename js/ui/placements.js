// Onglet Placements : saisie et historique des valorisations.

import { etat, sauvegarder } from "../noyau/etat.js";
import { centimesVersEuros, echapper, eurosVersCentimes, ligneMontant, nouvelEnregistrement } from "../noyau/outils.js";
import { comptesActifs, estPlacement, iconeType, netVerse, valeurEstimee } from "../noyau/comptes.js";
import { aujourdhui, dateDuMoment, enJours } from "../noyau/dates.js";
import { rafraichir } from "../rendu.js";
import { supprimerAvecAnnulation } from "./notifications.js";

// Bandeau du haut : valeur totale des placements, gain et total versé
export function afficherBandeauPlacements() {
  const zone = document.getElementById("carte-placements");
  const comptes = comptesActifs().filter(estPlacement);
  if (comptes.length === 0) {
    zone.innerHTML = "";
    return;
  }
  const valeur = comptes.reduce((s, c) => s + valeurEstimee(c), 0);
  const verse = comptes.reduce((s, c) => s + netVerse(c), 0);
  const gain = valeur - verse;
  const signe = gain >= 0 ? "+" : "−";
  const pct = verse > 0
    ? " (" + signe + (Math.abs(gain) / verse * 100).toFixed(1).replace(".", ",") + " %)"
    : "";
  zone.innerHTML = `
    <div class="hero patrimoine-hero">
      <div>
        <div class="petit">Valeur totale des placements</div>
        <div class="gros">${centimesVersEuros(valeur)}</div>
        <div class="petit">Gain ${signe} ${centimesVersEuros(Math.abs(gain))}${pct}</div>
      </div>
      <i class="hero-icone" aria-hidden="true">📈</i>
    </div>
    <div class="prev-corps">
      ${ligneMontant("Total versé", verse)}
    </div>`;
}
function enregistrerValorisation() {
  const compteId = document.getElementById("valo-compte").value;
  const valeur = eurosVersCentimes(document.getElementById("valo-valeur").value);
  const message = document.getElementById("message-valo");
  if (!compteId) {
    message.textContent = "Crée d'abord un PEA ou une assurance vie";
    return;
  }
  if (isNaN(valeur) || valeur < 0) {
    message.textContent = "Valeur invalide";
    return;
  }
  message.textContent = "";
  etat.valorisations.push({
    ...nouvelEnregistrement("p"),
    compteId: compteId,
    date: new Date().toLocaleDateString("sv-SE"),
    valeur: valeur
  });
  document.getElementById("valo-valeur").value = "";
  sauvegarder();
  rafraichir();
}

// Versé net sur un compte à une date donnée (incluse)
function verseAu(compte, date) {
  let total = compte.verseDepart || 0;
  for (const v of etat.virements) {
    if (v.date > date) continue;
    if (v.versId === compte.id) total += v.montant;
    if (v.depuisId === compte.id) total -= v.montant;
  }
  return total;
}

function texteGain(valeur, verse) {
  const gain = valeur - verse;
  const signe = gain >= 0 ? "+" : "−";
  const pct = verse > 0
    ? " (" + signe + (Math.abs(gain) / verse * 100).toFixed(1).replace(".", ",") + " %)"
    : "";
  return "Gain " + signe + " " + centimesVersEuros(Math.abs(gain)) + pct;
}

function dateCourte(date) {
  return new Date(date + "T12:00:00").toLocaleDateString("fr-FR",
    { day: "numeric", month: "short", year: "2-digit" });
}

// Points de la courbe : départ du compte, valorisations, valeur actuelle
function pointsDuCompte(compte) {
  const pts = [];
  if (compte.creeLe > 1e12) {
    pts.push({ date: dateDuMoment(compte.creeLe), valeur: compte.soldeDepart });
  }
  for (const v of etat.valorisations) {
    if (v.compteId === compte.id) pts.push({ date: v.date, valeur: v.valeur });
  }
  pts.sort((a, b) => a.date.localeCompare(b.date));
  const actuelle = valeurEstimee(compte);
  if (pts.length === 0 || pts[pts.length - 1].valeur !== actuelle) {
    pts.push({ date: aujourdhui(), valeur: actuelle });
  }
  return pts;
}

function dessinerCourbe(compte) {
  const titre = iconeType(compte.type) + " " + echapper(compte.nom);
  const pts = pointsDuCompte(compte);
  const t0 = enJours(pts[0].date);
  const t1 = enJours(pts[pts.length - 1].date);
  if (pts.length < 2 || t1 === t0) {
    return `<div class="patrimoine"><div class="mu">${titre}</div>
      <div class="mu">La courbe apparaîtra dès que la valeur aura évolué (valorisation ou versement).</div></div>`;
  }
  const L = 300, H = 110, marge = 8;
  const valeurs = pts.map(p => p.valeur);
  let min = Math.min(...valeurs);
  let max = Math.max(...valeurs);
  const ecart = (max - min) || Math.max(1, Math.abs(max) * 0.1);
  min -= ecart * 0.15;
  max += ecart * 0.15;
  const x = p => marge + (enJours(p.date) - t0) / (t1 - t0) * (L - 2 * marge);
  const y = v => H - marge - (v - min) / (max - min) * (H - 2 * marge);
  const ligne = "M" + pts.map(p => x(p).toFixed(1) + "," + y(p.valeur).toFixed(1)).join(" L");
  const aire = ligne + " L" + x(pts[pts.length - 1]).toFixed(1) + "," + H
    + " L" + x(pts[0]).toFixed(1) + "," + H + " Z";
  const cercles = pts.map(p =>
    `<circle class="courbe-point" cx="${x(p).toFixed(1)}" cy="${y(p.valeur).toFixed(1)}" r="3"/>`).join("");
  const premier = pts[0];
  const dernier = pts[pts.length - 1];
  const delta = dernier.valeur - premier.valeur;
  const signe = delta >= 0 ? "+" : "−";
  return `
    <div class="patrimoine">
      <div class="mu">${titre}</div>
      <div class="moyen">${centimesVersEuros(dernier.valeur)}</div>
      <div class="mu">${signe} ${centimesVersEuros(Math.abs(delta))} depuis le ${dateCourte(premier.date)} (versements inclus)</div>
      <svg class="courbe" viewBox="0 0 ${L} ${H}" role="img" aria-label="Évolution de ${echapper(compte.nom)}">
        <path class="courbe-aire" d="${aire}"/>
        <path class="courbe-ligne" pathLength="1" d="${ligne}"/>
        ${cercles}
      </svg>
      <div class="courbe-axe"><span>${dateCourte(premier.date)}</span><span>${dateCourte(dernier.date)}</span></div>
    </div>`;
}

export function afficherCourbesPlacements() {
  document.getElementById("courbes-placements").innerHTML =
    comptesActifs().filter(estPlacement).map(dessinerCourbe).join("");
}

export function afficherValorisations() {
  const zone = document.getElementById("liste-valorisations");
  zone.innerHTML = "";
  const recentes = [...etat.valorisations]
    .sort((a, b) => b.creeLe - a.creeLe)
    .slice(0, 10);
  for (const v of recentes) {
    const compte = etat.comptes.find(c => c.id === v.compteId);
    zone.innerHTML += `
      <div class="op">
        <div>${echapper(compte.nom)}<small>${v.date}</small><small>${texteGain(v.valeur, verseAu(compte, v.date))}</small></div>
        <span>${centimesVersEuros(v.valeur)}</span>
        <button class="supprimer" data-id="${v.id}" aria-label="Supprimer">✕</button>
      </div>`;
  }
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initPlacements() {
  document.getElementById("bouton-valo").addEventListener("click", enregistrerValorisation);
  document.getElementById("liste-valorisations").addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    supprimerAvecAnnulation("Valorisation supprimée", () => {
      etat.valorisations = etat.valorisations.filter(v => v.id !== id);
    });
  });
}
