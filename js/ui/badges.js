// Affichage des séries et des badges, déblocage de nouveaux badges.

import { BADGES, serieSaisie, serieSansDepassement } from "../noyau/badges.js";
import { aujourdhui } from "../noyau/dates.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { montrerNotif } from "./notifications.js";

export function verifierBadges() {
  const nouveaux = [];
  for (const b of BADGES) {
    if (etat.badges.some(x => x.id === b.id)) continue;
    if (b.ok()) {
      etat.badges.push({ id: b.id, date: aujourdhui() });
      nouveaux.push(b.nom);
    }
  }
  if (nouveaux.length > 0) {
    sauvegarder();
    montrerNotif("Nouveau badge : " + nouveaux.join(", "));
  }
}

export function afficherSeries() {
  const saisie = serieSaisie();
  const sans = etat.budgets.length > 0 ? serieSansDepassement() : null;
  document.getElementById("carte-series").innerHTML = `
    <div class="ligne"><span>🔥 Saisie régulière</span>
      <strong>${saisie} semaine${saisie > 1 ? "s" : ""}</strong></div>
    <div class="ligne"><span>🛡️ Sans dépasser un plafond</span>
      <strong>${sans === null ? "—" : sans + " jour" + (sans > 1 ? "s" : "")}</strong></div>`;
}

export function afficherBadges() {
  const zone = document.getElementById("liste-badges");
  zone.innerHTML = "";
  for (const b of BADGES) {
    const obtenu = etat.badges.find(x => x.id === b.id);
    zone.innerHTML += `
      <div class="badge ${obtenu ? "" : "verrouille"}">
        <b>${obtenu ? "🏅" : "🔒"} ${b.nom}</b>
        <span>${b.desc}</span>
        ${obtenu ? `<small>Obtenu le ${obtenu.date}</small>` : ""}
      </div>`;
  }
}
