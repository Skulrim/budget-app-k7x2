const etat = {
  comptes: [],
  operations: [],
  categories: [
    { id: "logement", nom: "Logement", sens: "depense", portee: "commun" },
    { id: "courses", nom: "Courses", sens: "depense", portee: "commun" },
    { id: "electricite", nom: "Électricité", sens: "depense", portee: "commun" },
    { id: "eau", nom: "Eau", sens: "depense", portee: "commun" },
    { id: "internet", nom: "Internet", sens: "depense", portee: "commun" },
    { id: "assurances", nom: "Assurances", sens: "depense", portee: "commun" },
    { id: "sante", nom: "Santé", sens: "depense", portee: "commun" },
    { id: "animaux", nom: "Animaux", sens: "depense", portee: "commun" },
    { id: "sorties", nom: "Sorties et loisirs", sens: "depense", portee: "commun" },
    { id: "carburant", nom: "Carburant", sens: "depense", portee: "perso" },
    { id: "telephone", nom: "Forfait téléphone", sens: "depense", portee: "perso" },
    { id: "assurance-voiture", nom: "Assurance voiture", sens: "depense", portee: "perso" },
    { id: "loisirs", nom: "Loisirs", sens: "depense", portee: "perso" },
    { id: "anniversaires", nom: "Anniversaires", sens: "depense", portee: "perso" },
    { id: "restaurants", nom: "Restaurants", sens: "depense", portee: "tous" },
    { id: "abonnements", nom: "Abonnements", sens: "depense", portee: "tous" },
    { id: "autre", nom: "Autre", sens: "depense", portee: "tous" },
    { id: "salaire", nom: "Salaire", sens: "revenu", portee: "tous" },
    { id: "primes", nom: "Primes", sens: "revenu", portee: "tous" },
    { id: "remboursements", nom: "Remboursements", sens: "revenu", portee: "tous" },
    { id: "revente", nom: "Revente", sens: "revenu", portee: "tous" },
    { id: "autre-revenu", nom: "Autre", sens: "revenu", portee: "tous" }
  ],
  budgets: [],
  reglages: { moisMatelas: 3 },
  objectifs: [],
  misesDeCote: [],
  badges: [],
  bilansVus: [],
  virements: [],
  valorisations: []
};
const CLE = "budget-etat-v1";

function sauvegarder() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch (e) {
    console.error("Sauvegarde impossible", e);
  }
}

function charger() {
  try {
    const texte = localStorage.getItem(CLE);
    if (texte) Object.assign(etat, JSON.parse(texte));
  } catch (e) {
    console.error("Lecture impossible", e);
  }
}

function centimesVersEuros(c) {
  return (c / 100).toLocaleString("fr-FR",
    { style: "currency", currency: "EUR" });
}
function echapper(texte) {
  return String(texte)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
const TYPES_PLACEMENT = ["pea", "assurance-vie"];

function estPlacement(compte) {
  return TYPES_PLACEMENT.includes(compte.type);
}

function momentDe(id) {
  return Number(id.slice(1)) || 0;
}

function referencePlacement(compte) {
  let ref = { moment: momentDe(compte.id), valeur: compte.soldeDepart };
  for (const v of etat.valorisations) {
    if (v.compteId !== compte.id) continue;
    if (momentDe(v.id) > ref.moment) ref = { moment: momentDe(v.id), valeur: v.valeur };
  }
  return ref;
}

function valeurEstimee(compte) {
  const ref = referencePlacement(compte);
  let valeur = ref.valeur;
  for (const v of etat.virements) {
    if (momentDe(v.id) <= ref.moment) continue;
    if (v.versId === compte.id) valeur += v.montant;
    if (v.depuisId === compte.id) valeur -= v.montant;
  }
  return valeur;
}

function netVerse(compte) {
  let total = compte.verseDepart || 0;
  for (const v of etat.virements) {
    if (v.versId === compte.id) total += v.montant;
    if (v.depuisId === compte.id) total -= v.montant;
  }
  return total;
}

function detailPlacement(compte) {
  const verse = netVerse(compte);
  const gain = valeurEstimee(compte) - verse;
  const signe = gain >= 0 ? "+" : "−";
  const pct = verse > 0
    ? " (" + signe + (Math.abs(gain) / verse * 100).toFixed(1).replace(".", ",") + " %)"
    : "";
  return `<small class="detail">Versé ${centimesVersEuros(verse)} · Gain ${signe} ${centimesVersEuros(Math.abs(gain))}${pct}</small>`;
}

function calculerSolde(compteId) {
  const compte = etat.comptes.find(c => c.id === compteId);
  if (estPlacement(compte)) return valeurEstimee(compte);
  let solde = compte.soldeDepart;
  for (const op of etat.operations) {
    if (op.compteId !== compteId) continue;
    if (op.sens === "revenu") solde += op.montant;
    else solde -= op.montant;
  }
  for (const v of etat.virements) {
    if (v.depuisId === compteId) solde -= v.montant;
    if (v.versId === compteId) solde += v.montant;
  }
  return solde;
}

function dessinerComptes(idZone, filtre) {
  const zone = document.getElementById(idZone);
  zone.innerHTML = "";
  for (const compte of comptesActifs().filter(filtre)) {
    const solde = calculerSolde(compte.id);
    zone.innerHTML += `
      <div class="carte">
        <div>
          <span>${echapper(compte.nom)}</span>
          ${estPlacement(compte) ? detailPlacement(compte) : ""}
        </div>
        <strong>${centimesVersEuros(solde)}</strong>
      </div>`;
  }
}

const ORDRE_TYPES = ["livret", "pea", "assurance-vie", "courant"];

function ordreType(type) {
  const i = ORDRE_TYPES.indexOf(type);
  return i === -1 ? 99 : i;
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
function afficherComptes() {
  dessinerComptesParType();
  dessinerComptes("liste-comptes-perso",
    c => c.type === "courant" && c.proprietaire !== "commun");
  dessinerComptes("liste-comptes-commun",
    c => c.type === "courant" && c.proprietaire === "commun");
  dessinerComptes("liste-livrets", c => c.type === "livret");
  dessinerComptes("liste-placements", estPlacement);
}
function eurosVersCentimes(texte) {
  return Math.round(parseFloat(texte.replace(",", ".")) * 100);
}

function remplirChoixComptes() {
  for (const idMenu of ["choix-compte", "virement-depuis", "virement-vers"]) {
    const choix = document.getElementById(idMenu);
    choix.innerHTML = "";
    for (const compte of comptesActifs()) {
      if (idMenu === "choix-compte" && estPlacement(compte)) continue;
      choix.innerHTML += `<option value="${compte.id}">${echapper(compte.nom)}</option>`;
    }
  }
  remplirChoixPlacements();
}

function remplirChoixPlacements() {
  const choix = document.getElementById("valo-compte");
  choix.innerHTML = "";
  for (const compte of comptesActifs().filter(estPlacement)) {
    choix.innerHTML += `<option value="${compte.id}">${echapper(compte.nom)}</option>`;
  }
}
function categoriesPour(compteId, sens) {
  const portee = porteeDuCompte(compteId);
  return etat.categories.filter(cat =>
    cat.sens === sens && (cat.portee === portee || cat.portee === "tous"));
}

function remplirChoixCategories() {
  const compteId = document.getElementById("choix-compte").value;
  const sens = document.getElementById("choix-sens").value;
  const choix = document.getElementById("choix-categorie");
  if (!compteId) {
    choix.innerHTML = "";
    return;
  }
  choix.innerHTML = "";
  for (const cat of categoriesPour(compteId, sens)) {
    choix.innerHTML += `<option value="${cat.id}">${echapper(cat.nom)}</option>`;
  }
}

function nomCategorie(id) {
  const cat = etat.categories.find(c => c.id === id);
  return echapper(cat ? cat.nom : id);
}

document.getElementById("choix-compte").addEventListener("change", remplirChoixCategories);
document.getElementById("choix-sens").addEventListener("change", remplirChoixCategories);

const SEUIL_ALERTE = 0.8;

function porteeDuCompte(compteId) {
  const compte = etat.comptes.find(c => c.id === compteId);
  return compte.proprietaire === "commun" ? "commun" : "perso";
}

function moisCourant() {
  return new Date().toLocaleDateString("sv-SE").slice(0, 7);
}

function depenseDuMois(portee, categorieId, mois = moisCourant()) {
  let total = 0;
  for (const op of etat.operations) {
    if (op.sens !== "depense") continue;
    if (op.categorie !== categorieId) continue;
    if (!op.date.startsWith(mois)) continue;
    if (porteeDuCompte(op.compteId) !== portee) continue;
    total += op.montant;
  }
  return total;
}

function afficherBudgets() {
  for (const portee of ["perso", "commun"]) {
    const zone = document.getElementById("liste-budgets-" + portee);
    zone.innerHTML = "";
    for (const b of etat.budgets.filter(b => b.portee === portee)) {
      const depense = depenseDuMois(b.portee, b.categorie);
      const ratio = depense / b.montant;
      const pct = Math.min(100, Math.round(ratio * 100));
      const alerte = ratio >= SEUIL_ALERTE;
      const texte = ratio >= 1 ? "Plafond dépassé" : "Presque au plafond";
      zone.innerHTML += `
        <div class="budget">
          <div class="budget-ligne">
            <span>${nomCategorie(b.categorie)}</span>
            <span>${centimesVersEuros(depense)} / ${centimesVersEuros(b.montant)}
              <button class="supprimer" data-portee="${b.portee}" data-cat="${echapper(b.categorie)}"
                aria-label="Retirer ce budget">✕</button></span>
          </div>
          <div class="jauge">
            <div class="jauge-remplie ${alerte ? "alerte" : ""}" data-pct="${pct}" style="width:${pct}%"></div>
          </div>
          ${alerte ? `<small class="texte-alerte">${texte}</small>` : ""}
        </div>`;
    }
  }
}
function joursRestants() {
  const d = new Date();
  const dernierJour = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return dernierJour - d.getDate();
}

function afficherReste() {
  let prevu = 0, depense = 0;
  for (const b of etat.budgets) {
    prevu += b.montant;
    depense += depenseDuMois(b.portee, b.categorie);
  }
  const reste = prevu - depense;
  const ratio = prevu > 0 ? Math.min(1, depense / prevu) : 0;
  const circonference = 2 * Math.PI * 40;
  const trait = ratio * circonference;
  document.getElementById("carte-reste").innerHTML = `
    <div class="anneau">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="#86a3ff" stroke-width="9"/>
         <circle cx="48" cy="48" r="40" fill="none" stroke="#ffffff" stroke-width="9"
          stroke-linecap="round" stroke-dasharray="${trait} ${circonference}"
          data-trait="${trait}" data-circ="${circonference}"/>
      </svg>
      <b>${Math.round(ratio * 100)} %</b>
    </div>
    <div>
      <div class="petit">${reste >= 0 ? "Il te reste" : "Tu dépasses de"}</div>
      <div class="gros">${centimesVersEuros(Math.abs(reste))}</div>
      <div class="petit">sur ${centimesVersEuros(prevu)} · ${joursRestants()} jours restants</div>
    </div>`;
}
const NOMS_TYPES = {
  "courant": "Comptes courants",
  "livret": "Livrets",
  "pea": "PEA",
  "assurance-vie": "Assurance vie"
};
function normaliser(texte) {
  return texte.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function creerIdCategorie(nom) {
  const base = normaliser(nom).replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "categorie";
  let id = base;
  let n = 2;
  while (etat.categories.some(c => c.id === id)) {
    id = base + "-" + n;
    n++;
  }
  return id;
}

function remplirSuggestionsBudget() {
  const liste = document.getElementById("suggestions-budget");
  liste.innerHTML = "";
  const noms = [...new Set(
    etat.categories.filter(c => c.sens === "depense").map(c => c.nom))];
  for (const nom of noms) {
    liste.innerHTML += `<option value="${echapper(nom)}"></option>`;
  }
}

function enregistrerBudget() {
  const nom = document.getElementById("budget-nom").value.trim();
  const portee = document.getElementById("budget-portee").value;
  const montant = eurosVersCentimes(document.getElementById("budget-montant").value);
  const message = document.getElementById("message-budget");
  if (nom === "") {
    message.textContent = "Donne un nom au poste";
    return;
  }
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  if (!document.getElementById("choix-compte").value) {
    message.textContent = "Crée d'abord un compte (⚙ Réglages)";
    return;
  }
  let categorie = etat.categories.find(c =>
    c.sens === "depense"
    && (c.portee === portee || c.portee === "tous")
    && normaliser(c.nom) === normaliser(nom));
  if (!categorie) {
    categorie = { id: creerIdCategorie(nom), nom: nom, sens: "depense", portee: portee };
    etat.categories.push(categorie);
  }
  const existant = etat.budgets.find(b =>
    b.portee === portee && b.categorie === categorie.id);
  if (existant) {
    existant.montant = montant;
    message.textContent = "Budget mis à jour";
  } else {
    etat.budgets.push({ portee: portee, categorie: categorie.id, montant: montant });
    message.textContent = "Budget ajouté";
  }
  document.getElementById("budget-nom").value = "";
  document.getElementById("budget-montant").value = "";
  sauvegarder();
  remplirChoixCategories();
  remplirSuggestionsBudget();
  rafraichir();
}

function retirerBudget(e) {
  const portee = e.target.dataset.portee;
  const cat = e.target.dataset.cat;
  if (!portee || !cat) return;
  if (!confirm("Retirer ce budget ? Les dépenses déjà saisies sont conservées.")) return;
  etat.budgets = etat.budgets.filter(b => !(b.portee === portee && b.categorie === cat));
  sauvegarder();
  rafraichir();
}

document.getElementById("bouton-budget").addEventListener("click", enregistrerBudget);
document.getElementById("liste-budgets-perso").addEventListener("click", retirerBudget);
document.getElementById("liste-budgets-commun").addEventListener("click", retirerBudget);
function moisDecale(decalage) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + decalage);
  return d.toLocaleDateString("sv-SE").slice(0, 7);
}

function depensesMensuelles() {
  const totaux = [];
  for (let n = 1; n <= 3; n++) {
    const mois = moisDecale(-n);
    let total = 0;
    for (const op of etat.operations) {
      if (op.sens === "depense" && op.date.startsWith(mois)) total += op.montant;
    }
    if (total > 0) totaux.push(total);
  }
  if (totaux.length > 0) {
    const somme = totaux.reduce((a, b) => a + b, 0);
    return { montant: Math.round(somme / totaux.length), source: "tes dépenses des mois passés" };
  }
  const prevu = etat.budgets.reduce((s, b) => s + b.montant, 0);
  return { montant: prevu, source: "tes budgets (pas encore d'historique)" };
}

function afficherMatelas() {
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

document.getElementById("choix-mois-matelas").addEventListener("change", (e) => {
  etat.reglages.moisMatelas = Number(e.target.value);
  sauvegarder();
  rafraichir();
});
function totalEnveloppes() {
  return etat.misesDeCote.reduce((somme, m) => somme + m.montant, 0);
}

function totalMisDeCote(objectifId) {
  let total = 0;
  for (const m of etat.misesDeCote) {
    if (m.objectifId === objectifId) total += m.montant;
  }
  return total;
}

function afficherObjectifs() {
  const zone = document.getElementById("liste-objectifs");
  const choix = document.getElementById("objectif-choix");
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
          <span>${echapper(o.nom)}</span>
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

function afficherMises() {
  const zone = document.getElementById("liste-mises");
  zone.innerHTML = "";
  const recentes = [...etat.misesDeCote]
    .sort((a, b) => momentDe(b.id) - momentDe(a.id))
    .slice(0, 10);
  for (const m of recentes) {
    const o = etat.objectifs.find(x => x.id === m.objectifId);
    zone.innerHTML += `
      <div class="op">
        <div>${echapper(o ? o.nom : "?")}<small>${m.date}</small></div>
        <span>${centimesVersEuros(m.montant)}</span>
        <button class="supprimer" data-mise="${m.id}" aria-label="Supprimer">✕</button>
      </div>`;
  }
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
  etat.objectifs.push({ id: "g" + Date.now(), nom: nom, cible: cible });
  document.getElementById("objectif-nom").value = "";
  document.getElementById("objectif-cible").value = "";
  sauvegarder();
  rafraichir();
}

function mettreDeCote() {
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
  message.textContent = "";
  etat.misesDeCote.push({
    id: "m" + Date.now(),
    objectifId: objectifId,
    montant: montant,
    date: new Date().toLocaleDateString("sv-SE")
  });
  document.getElementById("objectif-ajout").value = "";
  sauvegarder();
  rafraichir();
}

function supprimerObjectif(e) {
  const id = e.target.dataset.objectif;
  if (!id) return;
  if (!confirm("Supprimer cet objectif ? Ton argent n'est pas touché, seul le suivi disparaît.")) return;
  etat.objectifs = etat.objectifs.filter(o => o.id !== id);
  etat.misesDeCote = etat.misesDeCote.filter(m => m.objectifId !== id);
  sauvegarder();
  rafraichir();
}

document.getElementById("bouton-objectif-creer").addEventListener("click", creerObjectif);
document.getElementById("bouton-objectif-ajout").addEventListener("click", mettreDeCote);
document.getElementById("liste-objectifs").addEventListener("click", supprimerObjectif);
document.getElementById("liste-mises").addEventListener("click", (e) => {
  const id = e.target.dataset.mise;
  if (!id) return;
  if (!confirm("Supprimer cette mise de côté ?")) return;
  etat.misesDeCote = etat.misesDeCote.filter(m => m.id !== id);
  sauvegarder();
  rafraichir();
});
function comptesActifs() {
  return etat.comptes.filter(c => !c.archive);
}

function afficherGestionComptes() {
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

document.getElementById("gestion-comptes").addEventListener("click", changerArchivage);
document.getElementById("comptes-archives").addEventListener("click", changerArchivage);

function totalPar(filtre) {
  let total = 0;
  for (const compte of comptesActifs()) {
    if (filtre(compte)) total += calculerSolde(compte.id);
  }
  return total;
}

function ligneMontant(nom, montant) {
  return `<div class="ligne"><span>${echapper(nom)}</span><strong>${centimesVersEuros(montant)}</strong></div>`;
}

function afficherPatrimoine() {
  const estTreso = c => c.type === "courant";
  const epargne = totalPar(c => !estTreso(c));
  const treso = totalPar(estTreso);
  document.getElementById("carte-patrimoine").innerHTML = `
    <div class="mu">Épargne et placements</div>
    <div class="gros">${centimesVersEuros(epargne)}</div>
    ${ligneMontant("Trésorerie (comptes courants)", treso)}
    ${ligneMontant("Total général", epargne + treso)}`;
}
function ajouterVirement() {
  const montant = eurosVersCentimes(document.getElementById("virement-montant").value);
  const depuis = document.getElementById("virement-depuis").value;
  const vers = document.getElementById("virement-vers").value;
  const message = document.getElementById("message-virement");
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  if (depuis === vers) {
    message.textContent = "Choisis deux comptes différents";
    return;
  }
  message.textContent = "";
  etat.virements.push({
    id: "v" + Date.now(),
    depuisId: depuis,
    versId: vers,
    montant: montant,
    date: new Date().toLocaleDateString("sv-SE")
  });
  document.getElementById("virement-montant").value = "";
  document.getElementById("panneau-saisie").hidden = true;
  sauvegarder();
  rafraichir();
}

function afficherVirements() {
  const zone = document.getElementById("liste-virements");
  zone.innerHTML = "";
  const recents = [...etat.virements]
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  for (const v of recents) {
    const depuis = etat.comptes.find(c => c.id === v.depuisId);
    const vers = etat.comptes.find(c => c.id === v.versId);
    zone.innerHTML += `
      <div class="op">
        <div>${echapper(depuis.nom)} → ${echapper(vers.nom)}<small>${v.date}</small></div>
        <span>${centimesVersEuros(v.montant)}</span>
        <button class="supprimer" data-id="${v.id}" aria-label="Supprimer">✕</button>
      </div>`;
  }
}
function majChampVerse() {
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

document.getElementById("compte-type").addEventListener("change", majChampVerse);
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
    id: "p" + Date.now(),
    compteId: compteId,
    date: new Date().toLocaleDateString("sv-SE"),
    valeur: valeur
  });
  document.getElementById("valo-valeur").value = "";
  sauvegarder();
  rafraichir();
}

function afficherValorisations() {
  const zone = document.getElementById("liste-valorisations");
  zone.innerHTML = "";
  const recentes = [...etat.valorisations]
    .sort((a, b) => momentDe(b.id) - momentDe(a.id))
    .slice(0, 10);
  for (const v of recentes) {
    const compte = etat.comptes.find(c => c.id === v.compteId);
    zone.innerHTML += `
      <div class="op">
        <div>${echapper(compte.nom)}<small>${v.date}</small></div>
        <span>${centimesVersEuros(v.valeur)}</span>
        <button class="supprimer" data-id="${v.id}" aria-label="Supprimer">✕</button>
      </div>`;
  }
}

document.getElementById("bouton-valo").addEventListener("click", enregistrerValorisation);

document.getElementById("liste-valorisations").addEventListener("click", (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (!confirm("Supprimer cette valorisation ?")) return;
  etat.valorisations = etat.valorisations.filter(v => v.id !== id);
  sauvegarder();
  rafraichir();
});
function etatValide(e) {
  if (!e || !Array.isArray(e.comptes) || !Array.isArray(e.operations)
    || !Array.isArray(e.virements)) return false;
  const dateOk = d => /^\d{4}-\d{2}-\d{2}$/.test(d);
  const idOk = id => /^[a-z]+\d+$/.test(id);
  const montantOk = m => Number.isInteger(m) && m > 0;
  const ids = new Set(e.comptes.map(c => c.id));
  return e.comptes.every(c => idOk(c.id) && Number.isInteger(c.soldeDepart)
      && (c.archive === undefined || typeof c.archive === "boolean"))
    && e.operations.every(o => idOk(o.id) && dateOk(o.date) && montantOk(o.montant)
      && ["revenu", "depense"].includes(o.sens) && ids.has(o.compteId))
    && e.virements.every(v => idOk(v.id) && dateOk(v.date) && montantOk(v.montant)
      && ids.has(v.depuisId) && ids.has(v.versId))
    && (e.budgets || []).every(b => ["commun", "perso"].includes(b.portee)
      && montantOk(b.montant) && /^[a-z0-9-]+$/.test(b.categorie))
    && (e.categories || []).every(c => /^[a-z0-9-]+$/.test(c.id)
      && ["depense", "revenu"].includes(c.sens))
    && (e.valorisations || []).every(v => idOk(v.id) && dateOk(v.date)
      && Number.isInteger(v.valeur) && ids.has(v.compteId))
      && (e.reglages === undefined || [3, 4, 5, 6].includes(e.reglages.moisMatelas))
      && (e.objectifs || []).every(o => idOk(o.id) && montantOk(o.cible))
    && (e.misesDeCote || []).every(m => idOk(m.id) && dateOk(m.date)
      && montantOk(m.montant) && (e.objectifs || []).some(o => o.id === m.objectifId))
      && (e.badges || []).every(x => /^[a-z-]+$/.test(x.id) && dateOk(x.date))
      && (e.bilansVus || []).every(m => /^\d{4}-\d{2}$/.test(m));
}

function exporterSauvegarde() {
  const contenu = JSON.stringify(
    { version: 1, exporteLe: new Date().toISOString(), etat: etat }, null, 2);
  const blob = new Blob([contenu], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = "budget-sauvegarde-" + new Date().toLocaleDateString("sv-SE") + ".json";
  lien.click();
  URL.revokeObjectURL(url);
}

function importerSauvegarde(fichier) {
  const message = document.getElementById("message-sauvegarde");
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try {
      const donnees = JSON.parse(lecteur.result);
      if (!etatValide(donnees.etat)) throw new Error("format");
      if (!confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) return;
      Object.assign(etat, { objectifs: [], misesDeCote: [], badges: [], bilansVus: [] }, donnees.etat);
      sauvegarder();
      remplirChoixComptes();
      remplirChoixCategories();
      rafraichir();
      message.textContent = "Sauvegarde importée";
    } catch (e) {
      message.textContent = "Fichier non valide";
    }
  };
  lecteur.readAsText(fichier);
}

document.getElementById("bouton-export").addEventListener("click", exporterSauvegarde);
document.getElementById("fichier-import").addEventListener("change", (e) => {
  if (e.target.files[0]) importerSauvegarde(e.target.files[0]);
  e.target.value = "";
});
function ajouterOperation() {
  const montant = eurosVersCentimes(document.getElementById("montant").value);
  const message = document.getElementById("message");
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  message.textContent = "";
  etat.operations.push({
    id: "o" + Date.now(),
    compteId: document.getElementById("choix-compte").value,
    sens: document.getElementById("choix-sens").value,
    montant: montant,
    date: new Date().toLocaleDateString("sv-SE"),
    categorie: document.getElementById("choix-categorie").value
  });
  document.getElementById("montant").value = "";
  document.getElementById("panneau-saisie").hidden = true;
  sauvegarder();
  rafraichir();
}
function afficherOperations() {
  for (const portee of ["perso", "commun"]) {
    const zone = document.getElementById("liste-operations-" + portee);
    zone.innerHTML = "";
    const recentes = [...etat.operations]
      .filter(op => porteeDuCompte(op.compteId) === portee)
      .reverse()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
    for (const op of recentes) {
      const compte = etat.comptes.find(c => c.id === op.compteId);
      const signe = op.sens === "revenu" ? "+" : "−";
      zone.innerHTML += `
        <div class="op">
          <div>${nomCategorie(op.categorie)}<small>${op.date} · ${echapper(compte.nom)}</small></div>
          <span class="${op.sens}">${signe} ${centimesVersEuros(op.montant)}</span>
          <button class="supprimer" data-id="${op.id}" aria-label="Supprimer">✕</button>
        </div>`;
    }
  }
}

function rafraichir() {
  afficherComptes();
  afficherOperations();
  afficherBudgets();
  afficherReste();
  afficherVirements();
  afficherValorisations();
  afficherPatrimoine();
  afficherGestionComptes();
  afficherMatelas();
  afficherObjectifs();
  afficherMises();
  verifierBadges();
  afficherSeries();
  afficherBadges();
  afficherCarteBilan();
}

function supprimerOperation(e) {
  const id = e.target.dataset.id;
  if (!id) return;
  if (!confirm("Supprimer cette opération ?")) return;
  etat.operations = etat.operations.filter(op => op.id !== id);
  sauvegarder();
  rafraichir();
}

document.getElementById("liste-operations-perso").addEventListener("click", supprimerOperation);
document.getElementById("liste-operations-commun").addEventListener("click", supprimerOperation);
document.getElementById("bouton-ajouter").addEventListener("click", ajouterOperation);

document.getElementById("bouton-compte").addEventListener("click", creerCompte);

document.getElementById("bouton-virement").addEventListener("click", ajouterVirement);
document.getElementById("liste-virements").addEventListener("click", (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  if (!confirm("Supprimer ce virement ?")) return;
  etat.virements = etat.virements.filter(v => v.id !== id);
  sauvegarder();
  rafraichir();
});
function aujourdhui() {
  return new Date().toLocaleDateString("sv-SE");
}

function enJours(dateTexte) {
  const [a, m, j] = dateTexte.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, j) / 86400000);
}

function debutSemaine(dateTexte) {
  const n = enJours(dateTexte);
  return n - ((n + 3) % 7);
}

function toutesLesDates() {
  const dates = [];
  for (const liste of [etat.operations, etat.virements, etat.valorisations, etat.misesDeCote]) {
    for (const x of liste) dates.push(x.date);
  }
  return dates;
}

function serieSaisie() {
  const semaines = new Set(toutesLesDates().map(debutSemaine));
  let semaine = debutSemaine(aujourdhui());
  if (!semaines.has(semaine)) semaine -= 7;
  let serie = 0;
  while (semaines.has(semaine)) {
    serie++;
    semaine -= 7;
  }
  return serie;
}

function dernierDepassement() {
  let dernier = null;
  for (const b of etat.budgets) {
    const ops = etat.operations
      .filter(op => op.sens === "depense" && op.categorie === b.categorie
                    && porteeDuCompte(op.compteId) === b.portee)
      .sort((x, y) => x.date.localeCompare(y.date));
    let moisEnCours = "";
    let cumul = 0;
    let franchi = false;
    for (const op of ops) {
      const mois = op.date.slice(0, 7);
      if (mois !== moisEnCours) {
        moisEnCours = mois;
        cumul = 0;
        franchi = false;
      }
      cumul += op.montant;
      if (cumul >= b.montant && !franchi) {
        franchi = true;
        if (dernier === null || op.date > dernier) dernier = op.date;
      }
    }
  }
  return dernier;
}

function serieSansDepassement() {
  const dates = toutesLesDates().sort();
  if (dates.length === 0) return 0;
  const dernier = dernierDepassement();
  const depart = dernier !== null ? dernier : dates[0];
  return enJours(aujourdhui()) - enJours(depart);
}

const BADGES = [
  { id: "premier-pas", nom: "Premier pas", desc: "Première opération saisie",
    ok: () => etat.operations.length > 0 },
  { id: "regulier", nom: "Régulier", desc: "4 semaines de saisie d'affilée",
    ok: () => serieSaisie() >= 4 },
  { id: "marathon", nom: "Marathon", desc: "12 semaines de saisie d'affilée",
    ok: () => serieSaisie() >= 12 },
  { id: "sous-controle", nom: "Sous contrôle", desc: "7 jours sans dépasser un plafond",
    ok: () => etat.budgets.length > 0 && serieSansDepassement() >= 7 },
  { id: "mois-serein", nom: "Mois serein", desc: "30 jours sans dépasser un plafond",
    ok: () => etat.budgets.length > 0 && serieSansDepassement() >= 30 },
  { id: "objectif-atteint", nom: "Objectif atteint", desc: "Un objectif d'achat financé",
    ok: () => etat.objectifs.some(o => totalMisDeCote(o.id) >= o.cible) }
];

let minuterie = null;
function montrerNotif(texte) {
  const n = document.getElementById("notif");
  n.textContent = texte;
  n.hidden = false;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { n.hidden = true; }, 4000);
}

function verifierBadges() {
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

function afficherSeries() {
  const saisie = serieSaisie();
  const sans = etat.budgets.length > 0 ? serieSansDepassement() : null;
  document.getElementById("carte-series").innerHTML = `
    <div class="ligne"><span>🔥 Saisie régulière</span>
      <strong>${saisie} semaine${saisie > 1 ? "s" : ""}</strong></div>
    <div class="ligne"><span>🛡️ Sans dépasser un plafond</span>
      <strong>${sans === null ? "—" : sans + " jour" + (sans > 1 ? "s" : "")}</strong></div>`;
}

function afficherBadges() {
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
function moisPrecedent(mois) {
  const [a, m] = mois.split("-").map(Number);
  return new Date(a, m - 2, 1).toLocaleDateString("sv-SE").slice(0, 7);
}

function nomMois(mois) {
  const [a, m] = mois.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function operationsDuMois(mois) {
  return etat.operations.filter(op => op.date.startsWith(mois));
}

function somme(liste) {
  return liste.reduce((s, x) => s + x.montant, 0);
}

function calculerBilan(mois) {
  const ops = operationsDuMois(mois);
  const revenus = somme(ops.filter(o => o.sens === "revenu"));
  const depenses = somme(ops.filter(o => o.sens === "depense"));

  let epargne = 0;
  for (const v of etat.virements) {
    if (!v.date.startsWith(mois)) continue;
    const de = etat.comptes.find(c => c.id === v.depuisId);
    const vers = etat.comptes.find(c => c.id === v.versId);
    if (de.type === "courant" && vers.type !== "courant") epargne += v.montant;
    if (de.type !== "courant" && vers.type === "courant") epargne -= v.montant;
  }

  let respectes = 0;
  let pire = null;
  for (const b of etat.budgets) {
    const d = depenseDuMois(b.portee, b.categorie, mois);
    if (d >= b.montant) {
      const ecart = d - b.montant;
      if (!pire || ecart > pire.ecart) pire = { categorie: b.categorie, ecart: ecart };
    } else {
      respectes++;
    }
  }

  const depensesPrec = somme(operationsDuMois(moisPrecedent(mois))
    .filter(o => o.sens === "depense"));
  const variation = depensesPrec > 0
    ? Math.round((depenses - depensesPrec) / depensesPrec * 100) : null;

  const badges = etat.badges
    .filter(x => x.date.startsWith(mois))
    .map(x => BADGES.find(b => b.id === x.id))
    .filter(Boolean)
    .map(b => b.nom);

  return { revenus, depenses, epargne, respectes, pire, variation, badges,
           objectifs: somme(etat.misesDeCote.filter(m => m.date.startsWith(mois))) };
}

function afficherBilan(mois) {
  const b = calculerBilan(mois);
  const zone = document.getElementById("contenu-bilan");
  if (operationsDuMois(mois).length === 0 && b.epargne === 0 && b.objectifs === 0) {
    zone.innerHTML = `<h2>Bilan de ${nomMois(mois)}</h2><div class="mu">Rien à afficher pour ce mois.</div>`;
    return;
  }
  const solde = b.revenus - b.depenses;
  const total = etat.budgets.length;
  let html = `<h2>Bilan de ${nomMois(mois)}</h2>`;
  html += ligneMontant("Revenus", b.revenus);
  html += ligneMontant("Dépenses", b.depenses);
  html += `<div class="ligne"><span>Solde du mois</span><strong>${solde >= 0 ? "+" : "−"} ${centimesVersEuros(Math.abs(solde))}</strong></div>`;
  html += ligneMontant("Mis de côté (livrets, placements)", b.epargne);
  html += ligneMontant("Objectifs d'achat alimentés", b.objectifs);
  if (b.variation !== null) {
    html += `<div class="ligne"><span>Dépenses vs mois précédent</span><strong>${b.variation > 0 ? "+" : ""}${b.variation} %</strong></div>`;
  }
  if (total > 0) {
    html += `<div class="ligne"><span>Plafonds respectés</span><strong>${b.respectes} sur ${total}</strong></div>`;
    html += b.pire
      ? `<div class="texte-alerte">Plus gros dépassement : ${nomCategorie(b.pire.categorie)} ${b.pire.ecart > 0 ? "(+" + centimesVersEuros(b.pire.ecart) + ")" : "(plafond atteint pile)"}</div>`
      : `<div class="succes">✓ Aucun plafond dépassé</div>`;
  }
  if (b.badges.length > 0) {
    html += `<div class="succes">🏅 Badges du mois : ${b.badges.join(", ")}</div>`;
  }
  html += `<div class="mu">Pense à exporter une sauvegarde de tes données.</div>`;
  zone.innerHTML = html;
}

function moisParDefaut() {
  const precedent = moisDecale(-1);
  return operationsDuMois(precedent).length > 0 ? precedent : moisDecale(0);
}

function afficherCarteBilan() {
  const mois = moisParDefaut();
  const nouveau = mois === moisDecale(-1) && !etat.bilansVus.includes(mois);
  document.getElementById("carte-bilan").innerHTML = `
    <div class="ligne"><span>📅 Bilan de ${nomMois(mois)}</span>
      ${nouveau ? `<strong class="succes">Nouveau</strong>` : ""}</div>
    <button id="bouton-bilan" type="button" class="lien-action">Voir le bilan</button>`;
}

function ouvrirBilan() {
  const defaut = moisParDefaut();
  const choix = document.getElementById("choix-mois-bilan");
  choix.innerHTML = "";
  const mois = [0, 1, 2, 3, 4, 5].map(n => moisDecale(-n))
    .filter(m => m === defaut || operationsDuMois(m).length > 0);
  for (const m of mois) {
    choix.innerHTML += `<option value="${m}">${nomMois(m)}${m === moisDecale(0) ? " (en cours)" : ""}</option>`;
  }
  choix.value = defaut;
  afficherBilan(defaut);
  document.getElementById("panneau-bilan").hidden = false;
  if (defaut === moisDecale(-1) && !etat.bilansVus.includes(defaut)) {
    etat.bilansVus.push(defaut);
    sauvegarder();
    afficherCarteBilan();
  }
}

document.getElementById("carte-bilan").addEventListener("click", (e) => {
  if (e.target.id === "bouton-bilan") ouvrirBilan();
});
document.getElementById("choix-mois-bilan").addEventListener("change", (e) => {
  afficherBilan(e.target.value);
});
document.getElementById("fermer-bilan").addEventListener("click", () => {
  document.getElementById("panneau-bilan").hidden = true;
});
document.getElementById("bouton-export-bilan").addEventListener("click", exporterSauvegarde);
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
const VUES = ["accueil", "perso", "commun", "livrets", "placements", "reglages"];
let vuePrecedente = "accueil";

function afficherVue(nom) {
  if (nom !== "reglages") vuePrecedente = nom;
  for (const v of VUES) {
    document.getElementById("vue-" + v).hidden = (v !== nom);
  }
  for (const b of document.querySelectorAll(".barre button")) {
    b.classList.toggle("actif", b.dataset.vue === nom);
  }
  animerJauges();
  window.scrollTo(0, 0);
}

function afficherFormulaire(nom) {
  document.getElementById("formulaire-operation").hidden = (nom !== "operation");
  document.getElementById("formulaire-virement").hidden = (nom !== "virement");
  document.getElementById("onglet-operation").classList.toggle("actif", nom === "operation");
  document.getElementById("onglet-virement").classList.toggle("actif", nom === "virement");
}

for (const b of document.querySelectorAll(".barre button")) {
  b.addEventListener("click", () => afficherVue(b.dataset.vue));
}
document.getElementById("bouton-reglages").addEventListener("click", () => afficherVue("reglages"));
document.getElementById("fermer-reglages").addEventListener("click", () => afficherVue(vuePrecedente));

document.getElementById("bouton-plus").addEventListener("click", () => {
  afficherFormulaire("operation");
  document.getElementById("panneau-saisie").hidden = false;
});
document.getElementById("fermer-saisie").addEventListener("click", () => {
  document.getElementById("panneau-saisie").hidden = true;
});
document.getElementById("onglet-operation").addEventListener("click", () => afficherFormulaire("operation"));
document.getElementById("onglet-virement").addEventListener("click", () => afficherFormulaire("virement"));
charger();
remplirChoixComptes();
remplirChoixCategories();
majChampVerse();
remplirSuggestionsBudget();
rafraichir();
afficherVue("accueil");
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
