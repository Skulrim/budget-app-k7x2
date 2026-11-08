// Changement de vue (onglets, réglages) et animation des jauges.

function animerJauges() {
  const barres = document.querySelectorAll(".vue:not([hidden]) .jauge-remplie[data-pct]");
  const cercles = document.querySelectorAll(".vue:not([hidden]) circle[data-trait]");
  for (const b of barres) {
    b.style.transition = "none";
    b.style.width = "0%";
  }
  for (const c of cercles) {
    c.style.transition = "none";
    c.style.strokeDasharray = "0 " + c.dataset.circ;
  }
  void document.body.offsetWidth;
  for (const b of barres) {
    b.style.transition = "";
    b.style.width = b.dataset.pct + "%";
  }
  for (const c of cercles) {
    c.style.transition = "";
    c.style.strokeDasharray = c.dataset.trait + " " + c.dataset.circ;
  }
}

const VUES = ["accueil", "perso", "commun", "livrets", "placements", "reglages", "mouvements"];

let vuePrecedente = "accueil";

export function afficherVue(nom) {
  if (nom !== "reglages" && nom !== "mouvements") vuePrecedente = nom;
  for (const v of VUES) {
    document.getElementById("vue-" + v).hidden = (v !== nom);
  }
    if (nom !== "reglages") {
    for (const d of document.querySelectorAll("#vue-reglages details")) d.open = false;
  }
  const actif = nom === "mouvements" ? vuePrecedente : nom;
  for (const b of document.querySelectorAll(".barre button")) {
    b.classList.toggle("actif", b.dataset.vue === actif);
  }
  animerJauges();
  window.scrollTo(0, 0);
}

export function retourner() {
  afficherVue(vuePrecedente);
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initNavigation() {
  for (const b of document.querySelectorAll(".barre button")) {
    b.addEventListener("click", () => afficherVue(b.dataset.vue));
  }
  document.getElementById("bouton-reglages").addEventListener("click", () => afficherVue("reglages"));
  document.getElementById("fermer-reglages").addEventListener("click", () => afficherVue(vuePrecedente));
}
