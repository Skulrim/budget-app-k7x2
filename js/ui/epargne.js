// Onglet Livrets : matelas de sécurité, plans d'épargne, objectifs d'achat.

import { comptesActifs, estPlacement, iconeType, totalPar } from "../noyau/comptes.js";
import { moisCourant } from "../noyau/dates.js";
import { totalEnveloppes, totalMisDeCote, virementsVersLeMois } from "../noyau/epargne.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { depensesMensuelles } from "../noyau/operations.js";
import { centimesVersEuros, echapper, eurosVersCentimes, ligneMontant, normaliser, nouvelEnregistrement } from "../noyau/outils.js";
import { rafraichir } from "../rendu.js";
import { montrerNotif, supprimerAvecAnnulation } from "./notifications.js";

// Bandeau du haut : total des livrets et versements nets du mois
export function afficherBandeauLivrets() {
  const zone = document.getElementById("carte-livrets");
  const livrets = comptesActifs().filter(c => c.type === "livret");
  if (livrets.length === 0) {
    zone.innerHTML = "";
    return;
  }
  const ids = new Set(livrets.map(c => c.id));
  const mois = moisCourant();
  let flux = 0;
  for (const v of etat.virements) {
    if (!v.date.startsWith(mois)) continue;
    if (ids.has(v.versId)) flux += v.montant;
    if (ids.has(v.depuisId)) flux -= v.montant;
  }
  const signe = flux >= 0 ? "+" : "−";
  const enveloppes = totalEnveloppes();
  zone.innerHTML = `
    <div class="hero patrimoine-hero">
      <div>
        <div class="petit">Total des livrets</div>
        <div class="gros">${centimesVersEuros(totalPar(c => c.type === "livret"))}</div>
        <div class="petit">${signe} ${centimesVersEuros(Math.abs(flux))} ce mois-ci (versements nets)</div>
      </div>
      <i class="hero-icone" aria-hidden="true">🐷</i>
    </div>
    ${enveloppes > 0 ? `<div class="prev-corps">${ligneMontant("Dont réservé à tes objectifs d'achat", enveloppes)}</div>` : ""}`;
}
export function afficherMatelas() {
  const zone = document.getElementById("carte-matelas");
  const mois = etat.reglages.moisMatelas;
  document.getElementById("choix-mois-matelas").value = String(mois);
  const ref = depensesMensuelles();
  if (ref.montant <= 0) {
    zone.innerHTML = `<div class="mu">Ajoute des budgets ou des dépenses pour calculer ton objectif.</div>`;
    return;
  }
  const livrets = Math.max(0, totalPar(c => c.type === "livret") - totalEnveloppes());
  const cible = ref.montant * mois;
  const ratio = livrets / cible;
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  const couverts = (livrets / ref.montant).toFixed(1).replace(".", ",");
  const atteint = ratio >= 1;
  zone.innerHTML = `
    <div class="mu">Tes livrets, hors objectifs d'achat, couvrent</div>
    <div class="moyen">${couverts} mois de dépenses</div>
    <div class="ligne"><span>${centimesVersEuros(livrets)}</span><span>sur ${centimesVersEuros(cible)}</span></div>
    <div class="jauge"><div class="jauge-remplie" data-pct="${pct}" style="width:${pct}%"></div></div>
    ${atteint
      ? `<div class="succes">✓ Objectif atteint</div>`
      : `<div class="mu">Il manque ${centimesVersEuros(cible - livrets)}</div>`}
    <div class="mu">Basé sur ${echapper(ref.source)} : ${centimesVersEuros(ref.montant)} par mois</div>`;
}

export function afficherObjectifs() {
  const zone = document.getElementById("liste-objectifs");
  const choix = document.getElementById("objectif-choix");
    document.getElementById("bloc-mises").hidden = etat.objectifs.length === 0;
  const memoire = choix.value;
  zone.innerHTML = "";
  choix.innerHTML = "";
  for (const o of etat.objectifs) {
    const mis = totalMisDeCote(o.id);
    const ratio = mis / o.cible;
    const pct = Math.min(100, Math.round(ratio * 100));
    zone.innerHTML += `
      <div class="budget">
        <div class="budget-ligne">
          <span>🎯 ${echapper(o.nom)}</span>
          <span>${centimesVersEuros(mis)} / ${centimesVersEuros(o.cible)}
            <button class="supprimer" data-objectif="${o.id}"
              aria-label="Supprimer l'objectif">✕</button></span>
        </div>
        <div class="jauge"><div class="jauge-remplie" data-pct="${pct}" style="width:${pct}%"></div></div>
        ${ratio >= 1
          ? `<div class="succes">✓ Objectif atteint</div>`
          : `<small class="mu">Il manque ${centimesVersEuros(o.cible - mis)}</small>`}
      </div>`;
    choix.innerHTML += `<option value="${o.id}">${echapper(o.nom)}</option>`;
  }
    if (etat.objectifs.length === 0) {
    zone.innerHTML = `<div class="mu">Aucun objectif. Crée-en un dans ⚙ Réglages, « Épargne : plans et objectifs ».</div>`;
  }
  if (memoire) choix.value = memoire;

  const controle = document.getElementById("controle-objectifs");
  const livrets = totalPar(c => c.type === "livret");
  const enveloppes = totalEnveloppes();
  if (etat.objectifs.length === 0) {
    controle.innerHTML = "";
  } else if (enveloppes > livrets) {
    controle.innerHTML = `<small class="texte-alerte">Tes objectifs totalisent ${centimesVersEuros(enveloppes)}, mais tes livrets ne contiennent que ${centimesVersEuros(livrets)} : vérifie que l'argent est bien de côté.</small>`;
  } else {
    controle.innerHTML = `<small class="mu">${centimesVersEuros(enveloppes)} de tes ${centimesVersEuros(livrets)} de livrets sont réservés à tes objectifs.</small>`;
  }
}

export function afficherMises() {
  const zone = document.getElementById("liste-mises");
  zone.innerHTML = "";
  const recentes = [...etat.misesDeCote]
    .sort((a, b) => b.creeLe - a.creeLe)
    .slice(0, 10);
  for (const m of recentes) {
    const o = etat.objectifs.find(x => x.id === m.objectifId);
    const retrait = m.montant < 0;
    zone.innerHTML += `
      <div class="op">
        <div>${echapper(o ? o.nom : "?")}<small>${m.date}${retrait ? " · Retrait" : ""}</small></div>
        <span class="${retrait ? "" : "revenu"}">${retrait ? "−" : "+"} ${centimesVersEuros(Math.abs(m.montant))}</span>
        <button class="supprimer" data-mise="${m.id}" aria-label="Supprimer">✕</button>
      </div>`;
  }
}

function enregistrerPlan() {
  const compteId = document.getElementById("plan-compte").value;
  const montant = eurosVersCentimes(document.getElementById("plan-montant").value);
  const message = document.getElementById("message-plan");
  if (!compteId) {
    message.textContent = "Crée d'abord un livret, un PEA ou une assurance vie";
    return;
  }
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  const existant = etat.plansEpargne.find(p => p.compteId === compteId);
  if (existant) {
    existant.montant = montant;
    message.textContent = "Plan mis à jour";
  } else {
    etat.plansEpargne.push({ ...nouvelEnregistrement("e"), compteId: compteId, montant: montant });
    message.textContent = "Plan ajouté";
  }
  document.getElementById("plan-montant").value = "";
  sauvegarder();
  rafraichir();
}

function dessinerPlans(idZone, filtre) {
  const zone = document.getElementById(idZone);
  const plans = etat.plansEpargne.filter(p => {
    const c = etat.comptes.find(x => x.id === p.compteId);
    return c && !c.archive && filtre(c);
  });
  if (plans.length === 0) {
    zone.innerHTML = `<div class="mu">Aucun plan. Tu peux en créer un dans ⚙ Réglages, « Plans d'épargne ».</div>`;
    return;
  }
  zone.innerHTML = plans.map(p => {
    const c = etat.comptes.find(x => x.id === p.compteId);
    const fait = virementsVersLeMois(p.compteId);
    const ratio = fait / p.montant;
    const pct = Math.min(100, Math.round(ratio * 100));
    return `
      <div class="budget">
        <div class="budget-ligne">
          <span>${iconeType(c.type)} ${echapper(c.nom)}</span>
          <span>${centimesVersEuros(fait)} / ${centimesVersEuros(p.montant)}
            <button class="supprimer" data-plan="${p.id}" aria-label="Retirer ce plan">✕</button></span>
        </div>
        <div class="jauge"><div class="jauge-remplie" data-pct="${pct}" style="width:${pct}%"></div></div>
        ${ratio >= 1
          ? `<div class="succes">✓ Fait ce mois-ci</div>`
          : `<small class="mu">Il reste ${centimesVersEuros(p.montant - fait)} à verser</small>`}
      </div>`;
  }).join("");
}

export function afficherPlans() {
  dessinerPlans("liste-plans-livrets", c => c.type === "livret");
  dessinerPlans("liste-plans-placements", estPlacement);
}

function retirerPlan(e) {
  const id = e.target.dataset.plan;
  if (!id) return;
  supprimerAvecAnnulation("Plan d'épargne retiré", () => {
    etat.plansEpargne = etat.plansEpargne.filter(p => p.id !== id);
  });
}

function creerObjectif() {
  const nom = document.getElementById("objectif-nom").value.trim();
  const cible = eurosVersCentimes(document.getElementById("objectif-cible").value);
  const message = document.getElementById("message-objectif");
  if (nom === "") {
    message.textContent = "Donne un nom à l'objectif";
    return;
  }
  if (isNaN(cible) || cible <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  if (etat.objectifs.some(o => normaliser(o.nom) === normaliser(nom))) {
    message.textContent = "Cet objectif existe déjà";
    return;
  }
  message.textContent = "";
  etat.objectifs.push({ ...nouvelEnregistrement("g"), nom: nom, cible: cible });
  document.getElementById("objectif-nom").value = "";
  document.getElementById("objectif-cible").value = "";
  sauvegarder();
  rafraichir();
}

function mettreDeCote(sens) {
  const objectifId = document.getElementById("objectif-choix").value;
  const montant = eurosVersCentimes(document.getElementById("objectif-ajout").value);
  const message = document.getElementById("message-objectif-ajout");
  if (!objectifId) {
    message.textContent = "Crée d'abord un objectif";
    return;
  }
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  const dejaMis = totalMisDeCote(objectifId);
  if (sens < 0 && montant > dejaMis) {
    message.textContent = "Tu ne peux retirer que " + centimesVersEuros(dejaMis) + " au maximum";
    return;
  }
  message.textContent = "";
  etat.misesDeCote.push({
    ...nouvelEnregistrement("m"),
    objectifId: objectifId,
    montant: montant * sens,
    date: new Date().toLocaleDateString("sv-SE")
  });
  document.getElementById("objectif-ajout").value = "";
  sauvegarder();
  rafraichir();
}

function supprimerObjectif(e) {
  const id = e.target.dataset.objectif;
  if (!id) return;
  supprimerAvecAnnulation("Objectif supprimé", () => {
    etat.objectifs = etat.objectifs.filter(o => o.id !== id);
    etat.misesDeCote = etat.misesDeCote.filter(m => m.objectifId !== id);
  });
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initEpargne() {
  document.getElementById("choix-mois-matelas").addEventListener("change", (e) => {
    etat.reglages.moisMatelas = Number(e.target.value);
    sauvegarder();
    rafraichir();
  });
  document.getElementById("bouton-plan").addEventListener("click", enregistrerPlan);
  document.getElementById("liste-plans-livrets").addEventListener("click", retirerPlan);
  document.getElementById("liste-plans-placements").addEventListener("click", retirerPlan);
  document.getElementById("bouton-objectif-creer").addEventListener("click", creerObjectif);
  document.getElementById("bouton-objectif-ajout").addEventListener("click", () => mettreDeCote(1));
  document.getElementById("bouton-objectif-retrait").addEventListener("click", () => mettreDeCote(-1));
  document.getElementById("liste-objectifs").addEventListener("click", supprimerObjectif);
  document.getElementById("liste-mises").addEventListener("click", (e) => {
    const id = e.target.dataset.mise;
    if (!id) return;
    const mise = etat.misesDeCote.find(m => m.id === id);
    if (!mise) return;
    if (totalMisDeCote(mise.objectifId) - mise.montant < 0) {
      montrerNotif("Impossible : l'objectif deviendrait négatif. Supprime d'abord le retrait lié.");
      return;
    }
    supprimerAvecAnnulation("Ligne supprimée", () => {
      etat.misesDeCote = etat.misesDeCote.filter(m => m.id !== id);
    });
  });
}
