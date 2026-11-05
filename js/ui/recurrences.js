// Récurrences : carte « À valider », formulaire, liste.

import { iconeCategorie, nomCategorie } from "../noyau/categories.js";
import { dateEcheance, moisCourant, moisDecale } from "../noyau/dates.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { centimesVersEuros, echapper, eurosVersCentimes } from "../noyau/outils.js";
import { aValider } from "../noyau/recurrences.js";
import { rafraichir } from "../rendu.js";
import { supprimerAvecAnnulation } from "./notifications.js";
import { afficherFormulaire, edition, preparerSaisie } from "./saisie.js";
import { remplirChoixCategories } from "./selecteurs.js";

export function afficherAValider() {
  const zone = document.getElementById("carte-a-valider");
  const items = aValider();
  if (items.length === 0) {
    zone.innerHTML = "";
    return;
  }
  zone.innerHTML = `<h2>À valider</h2>` + items.map(({ r, mois, date }) => {
    const virement = r.type === "virement";
    const signe = virement ? "" : (r.sens === "revenu" ? "+ " : "− ");
    let titre;
    if (virement) {
      const de = etat.comptes.find(c => c.id === r.depuisId);
      const vers = etat.comptes.find(c => c.id === r.versId);
      titre = `↔️ ${echapper(de.nom)} → ${echapper(vers.nom)}`;
    } else {
      titre = `${iconeCategorie(r.categorie)} ${nomCategorie(r.categorie)}`;
    }
    const boutons = ["valider", "modifier", "passer"].map(act => `
      <button type="button" class="lien-action" data-rec="${r.id}" data-mois="${mois}" data-act="${act}">
        ${act === "valider" ? "Valider" : act === "modifier" ? "Modifier" : "Passer"}</button>`).join("");
    return `
      <div class="budget">
        <div class="budget-ligne">
          <span>${titre}${r.note ? " · " + echapper(r.note) : ""}</span>
          <span>${signe}${centimesVersEuros(r.montant)}</span>
        </div>
        <small class="mu">Prévu le ${date}</small>
        <div class="actions-rec">${boutons}</div>
      </div>`;
  }).join("");
}

function ouvrirRecurrence(r, mois) {
  const virement = r.type === "virement";
  if (virement) {
    const depuis = document.getElementById("virement-depuis");
    const vers = document.getElementById("virement-vers");
    depuis.value = r.depuisId;
    vers.value = r.versId;
    if (depuis.value !== r.depuisId || vers.value !== r.versId) return;
  } else {
    const choixCompte = document.getElementById("choix-compte");
    choixCompte.value = r.compteId;
    if (choixCompte.value !== r.compteId) return;
  }
  preparerSaisie();
  edition.recurrence = { id: r.id, mois: mois };
  const date = dateEcheance(mois, r.jour);
  const montant = (r.montant / 100).toFixed(2).replace(".", ",");
  if (virement) {
    afficherFormulaire("virement");
    document.getElementById("virement-montant").value = montant;
    document.getElementById("date-virement").value = date;
    document.getElementById("note-virement").value = r.note || "";
    document.getElementById("bouton-virement").textContent = "Valider";
    document.getElementById("titre-edition").textContent = "Valider le virement prévu";
  } else {
    afficherFormulaire("operation");
    document.getElementById("montant").value = montant;
    document.getElementById("date-operation").value = date;
    document.getElementById("choix-sens").value = r.sens;
    remplirChoixCategories();
    document.getElementById("choix-categorie").value = r.categorie;
    document.getElementById("note-operation").value = r.note || "";
    document.getElementById("bouton-ajouter").textContent = "Valider";
    document.getElementById("titre-edition").textContent = "Valider l'opération prévue";
  }
  document.getElementById("titre-edition").hidden = false;
  document.getElementById("annuler-edition").hidden = false;
  document.querySelector(".bascule").hidden = true;
  document.getElementById("panneau-saisie").hidden = false;
}

function majChampsRecurrence() {
  const virement = document.getElementById("rec-type").value === "virement";
  document.getElementById("rec-champs-operation").hidden = virement;
  document.getElementById("rec-champs-virement").hidden = !virement;
}

function enregistrerRecurrence() {
  const type = document.getElementById("rec-type").value;
  const montant = eurosVersCentimes(document.getElementById("rec-montant").value);
  const jour = Number(document.getElementById("rec-jour").value);
  const message = document.getElementById("message-recurrence");
  let base;
  if (type === "virement") {
    const depuisId = document.getElementById("rec-depuis").value;
    const versId = document.getElementById("rec-vers").value;
    if (!depuisId || !versId) {
      message.textContent = "Choisis deux comptes";
      return;
    }
    if (depuisId === versId) {
      message.textContent = "Choisis deux comptes différents";
      return;
    }
    base = { type: "virement", depuisId: depuisId, versId: versId };
  } else {
    const compteId = document.getElementById("rec-compte").value;
    const categorie = document.getElementById("rec-categorie").value;
    if (!compteId || !categorie) {
      message.textContent = "Choisis un compte et une catégorie";
      return;
    }
    base = { compteId: compteId, sens: document.getElementById("rec-sens").value, categorie: categorie };
  }
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  if (!Number.isInteger(jour) || jour < 1 || jour > 31) {
    message.textContent = "Le jour doit être entre 1 et 31";
    return;
  }
  etat.recurrentes.push({
    id: "r" + Date.now(), ...base, montant: montant, jour: jour,
    note: document.getElementById("rec-note").value.trim().slice(0, 80),
    debut: document.getElementById("rec-debut").value === "suivant" ? moisDecale(1) : moisCourant(),
    traites: []
  });
  message.textContent = "Ajouté";
  document.getElementById("rec-montant").value = "";
  document.getElementById("rec-jour").value = "";
  document.getElementById("rec-note").value = "";
  sauvegarder();
  rafraichir();
}

export function afficherRecurrentes() {
  const zone = document.getElementById("liste-recurrentes");
  if (etat.recurrentes.length === 0) {
    zone.innerHTML = `<div class="mu">Aucune opération ni virement récurrent.</div>`;
    return;
  }
  zone.innerHTML = etat.recurrentes.map(r => {
    const note = r.note ? `<small>${echapper(r.note)}</small>` : "";
    if (r.type === "virement") {
      const de = etat.comptes.find(c => c.id === r.depuisId);
      const vers = etat.comptes.find(c => c.id === r.versId);
      return `
        <div class="op">
          <i class="pastille">↔️</i>
          <div>Virement<small>Le ${r.jour} de chaque mois · ${de ? echapper(de.nom) : "?"} → ${vers ? echapper(vers.nom) : "?"}</small>${note}</div>
          <span>${centimesVersEuros(r.montant)}</span>
          <button class="supprimer" data-rec-supp="${r.id}" aria-label="Supprimer">✕</button>
        </div>`;
    }
    const compte = etat.comptes.find(c => c.id === r.compteId);
    const signe = r.sens === "revenu" ? "+" : "−";
    return `
      <div class="op">
        <i class="pastille">${iconeCategorie(r.categorie)}</i>
        <div>${nomCategorie(r.categorie)}<small>Le ${r.jour} de chaque mois · ${compte ? echapper(compte.nom) : "?"}</small>${note}</div>
        <span>${signe} ${centimesVersEuros(r.montant)}</span>
        <button class="supprimer" data-rec-supp="${r.id}" aria-label="Supprimer">✕</button>
      </div>`;
  }).join("");
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initRecurrences() {
  document.getElementById("carte-a-valider").addEventListener("click", (e) => {
    const id = e.target.dataset.rec;
    if (!id) return;
    const r = etat.recurrentes.find(x => x.id === id);
    const mois = e.target.dataset.mois;
    if (!r || r.traites.includes(mois)) return;
    const act = e.target.dataset.act;
    if (act === "modifier") {
      ouvrirRecurrence(r, mois);
      return;
    }
    if (act === "valider") {
      const date = dateEcheance(mois, r.jour);
      if (r.type === "virement") {
        etat.virements.push({
          id: "v" + Date.now(), depuisId: r.depuisId, versId: r.versId,
          montant: r.montant, date: date, note: r.note || ""
        });
      } else {
        etat.operations.push({
          id: "o" + Date.now(), compteId: r.compteId, sens: r.sens, montant: r.montant,
          date: date, categorie: r.categorie, note: r.note || ""
        });
      }
    }
    r.traites.push(mois);
    sauvegarder();
    rafraichir();
  });
  document.getElementById("liste-recurrentes").addEventListener("click", (e) => {
    const id = e.target.dataset.recSupp;
    if (!id) return;
    supprimerAvecAnnulation("Opération récurrente supprimée", () => {
      etat.recurrentes = etat.recurrentes.filter(r => r.id !== id);
    });
  });
  document.getElementById("bouton-recurrence").addEventListener("click", enregistrerRecurrence);
  document.getElementById("rec-type").addEventListener("change", majChampsRecurrence);
}
