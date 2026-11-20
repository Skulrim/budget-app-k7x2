// Changement de vue (onglets, réglages) et animation des jauges.

export function animerJauges() {
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

// Une vue à pastilles (Accueil, Livrets, Placements) revient sur sa première pastille quand on la quitte
function reinitialiserPastilles(vue) {
  const boutons = vue.querySelectorAll(".pastilles button");
  if (boutons.length === 0) return;
  const premier = boutons[0].dataset.onglet;
  for (const o of vue.querySelectorAll(".onglet-accueil")) {
    o.hidden = (o.id !== "onglet-" + premier);
  }
  boutons.forEach((b, i) => b.classList.toggle("actif", i === 0));
}

export function afficherVue(nom) {
  if (nom !== "reglages" && nom !== "mouvements") vuePrecedente = nom;
  for (const v of VUES) {
    const section = document.getElementById("vue-" + v);
    if (v !== nom && !section.hidden) reinitialiserPastilles(section); // la vue qu'on quitte
    section.hidden = (v !== nom);
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

// Ouvre les Réglages directement sur un bloc déplié (ex. « bloc-budgets »)
export function ouvrirReglages(idBloc) {
  afficherVue("reglages");
  const bloc = document.getElementById(idBloc);
  if (!bloc) return;
  bloc.open = true;
  bloc.scrollIntoView({ block: "start" });
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
  document.addEventListener("click", (e) => {
    const bouton = e.target.closest("[data-reglage]");
    if (bouton) ouvrirReglages(bouton.dataset.reglage);
  });
}
