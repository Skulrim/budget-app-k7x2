// Écrans des comptes : listes, patrimoine, création, archivage.

import { NOMS_TYPES, TYPES_PLACEMENT, calculerSolde, comptesActifs, estPlacement, iconeType, netVerse, ordreType, totalPar, valeurEstimee } from "../noyau/comptes.js";
import { etat, sauvegarder } from "../noyau/etat.js";
import { centimesVersEuros, echapper, eurosVersCentimes, ligneMontant } from "../noyau/outils.js";
import { rafraichir } from "../rendu.js";
import { remplirChoixCategories, remplirChoixComptes } from "./selecteurs.js";

function detailPlacement(compte) {
  const verse = netVerse(compte);
  const gain = valeurEstimee(compte) - verse;
  const signe = gain >= 0 ? "+" : "−";
  const pct = verse > 0
    ? " (" + signe + (Math.abs(gain) / verse * 100).toFixed(1).replace(".", ",") + " %)"
    : "";
  return `<small class="detail">Versé ${centimesVersEuros(verse)} · Gain ${signe} ${centimesVersEuros(Math.abs(gain))}${pct}</small>`;
}

function dessinerComptes(idZone, filtre) {
  const zone = document.getElementById(idZone);
  zone.innerHTML = comptesActifs().filter(filtre).map(compte => `
    <div class="carte">
      <i class="pastille">${iconeType(compte.type)}</i>
      <div>
        <span>${echapper(compte.nom)}</span>
        ${estPlacement(compte) ? detailPlacement(compte) : ""}
      </div>
      <strong>${centimesVersEuros(calculerSolde(compte.id))}</strong>
    </div>`).join("");
}

function dessinerComptesParType() {
  const zone = document.getElementById("liste-comptes");
  const types = [...new Set(comptesActifs().map(c => c.type))]
    .sort((a, b) => ordreType(a) - ordreType(b));
  let html = "";
  types.forEach((type, i) => {
    html += `
      <div class="ligne groupe">
        <span>${echapper(NOMS_TYPES[type] || type)}</span>
        <strong>${centimesVersEuros(totalPar(c => c.type === type))}</strong>
      </div>
      <div id="groupe-${i}"></div>`;
  });
  zone.innerHTML = html;
  types.forEach((type, i) => dessinerComptes("groupe-" + i, c => c.type === type));
}

export function afficherComptes() {
  dessinerComptesParType();
  dessinerComptes("liste-comptes-perso",
    c => c.type === "courant" && c.proprietaire !== "commun");
  dessinerComptes("liste-comptes-commun",
    c => c.type === "courant" && c.proprietaire === "commun");
  dessinerComptes("liste-livrets", c => c.type === "livret");
  dessinerComptes("liste-placements", estPlacement);
}

export function afficherGestionComptes() {
  const actifs = document.getElementById("gestion-comptes");
  const archives = document.getElementById("comptes-archives");
  actifs.innerHTML = "";
  archives.innerHTML = "";
  for (const c of etat.comptes) {
    const ligne = `
      <div class="op">
        <div>${echapper(c.nom)}<small>${echapper(NOMS_TYPES[c.type] || c.type)}</small></div>
        <button class="lien-action" data-id="${c.id}"
          data-action="${c.archive ? "reactiver" : "archiver"}">
          ${c.archive ? "Réactiver" : "Archiver"}</button>
      </div>`;
    if (c.archive) archives.innerHTML += ligne;
    else actifs.innerHTML += ligne;
  }
}

function changerArchivage(e) {
  const id = e.target.dataset.id;
  const action = e.target.dataset.action;
  if (!id || !action) return;
  const compte = etat.comptes.find(c => c.id === id);
  const message = document.getElementById("message-gestion");
  if (action === "archiver") {
    const solde = calculerSolde(id);
    if (solde !== 0) {
      message.textContent = "Solde de " + centimesVersEuros(solde)
        + " : vire d'abord l'argent vers un autre compte.";
      return;
    }
    if (!confirm("Archiver « " + compte.nom + " » ? Son historique est conservé.")) return;
    compte.archive = true;
  } else {
    compte.archive = false;
  }
  message.textContent = "";
  sauvegarder();
  remplirChoixComptes();
  remplirChoixCategories();
  rafraichir();
}

export function afficherPatrimoine() {
  const estTreso = c => c.type === "courant";
  const epargne = totalPar(c => !estTreso(c));
  const treso = totalPar(estTreso);
  document.getElementById("carte-patrimoine").innerHTML = `
    <div class="mu">Épargne et placements</div>
    <div class="gros">${centimesVersEuros(epargne)}</div>
    ${ligneMontant("Trésorerie (comptes courants)", treso)}
    ${ligneMontant("Total général", epargne + treso)}`;
}

export function majChampVerse() {
  const type = document.getElementById("compte-type").value;
  document.getElementById("compte-verse").hidden = !TYPES_PLACEMENT.includes(type);
}

function creerCompte() {
  const nom = document.getElementById("compte-nom").value.trim();
  const type = document.getElementById("compte-type").value;
  const texteSolde = document.getElementById("compte-solde").value.trim();
  const solde = texteSolde === "" ? 0 : eurosVersCentimes(texteSolde);
  const message = document.getElementById("message-compte");
  if (nom === "") {
    message.textContent = "Donne un nom au compte";
    return;
  }
  if (isNaN(solde)) {
    message.textContent = "Solde invalide";
    return;
  }
  if (etat.comptes.some(c => c.nom.toLowerCase() === nom.toLowerCase())) {
    message.textContent = "Ce nom existe déjà";
    return;
  }
  let verse = 0;
  if (TYPES_PLACEMENT.includes(type)) {
    verse = eurosVersCentimes(document.getElementById("compte-verse").value);
    if (isNaN(verse) || verse < 0) {
      message.textContent = "Indique le total déjà versé";
      return;
    }
  }
  message.textContent = "";
  etat.comptes.push({
    id: "c" + Date.now(),
    nom: nom,
    type: type,
    proprietaire: document.getElementById("compte-proprio").value,
    soldeDepart: solde,
    verseDepart: verse
  });
  document.getElementById("compte-nom").value = "";
  document.getElementById("compte-solde").value = "";
  document.getElementById("compte-verse").value = "";
  sauvegarder();
  remplirChoixComptes();
  remplirChoixCategories();
  rafraichir();
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initComptes() {
  document.getElementById("gestion-comptes").addEventListener("click", changerArchivage);
  document.getElementById("comptes-archives").addEventListener("click", changerArchivage);
  document.getElementById("compte-type").addEventListener("change", majChampVerse);
  document.getElementById("bouton-compte").addEventListener("click", creerCompte);
}
