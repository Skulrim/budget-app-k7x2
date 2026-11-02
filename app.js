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
  plansEpargne: [],
  recurrentes: [],
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
  remplirChoixPlan();
  remplirChoixRecurrence();
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
                <div class="budget cliquable" data-detail="${b.portee}:${echapper(b.categorie)}">
          <div class="budget-ligne">
            <span>${iconeCategorie(b.categorie)} ${nomCategorie(b.categorie)}</span>
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
    const budgetes = new Set(etat.budgets.map(b => b.portee + ":" + b.categorie));
  const comptees = new Set();
  for (const r of etat.recurrentes) {
    if (r.sens !== "depense" || r.debut > moisCourant()) continue;
    const compte = etat.comptes.find(c => c.id === r.compteId);
    if (!compte || compte.archive) continue;
    const portee = porteeDuCompte(r.compteId);
    const cle = portee + ":" + r.categorie;
    if (budgetes.has(cle)) continue;
    prevu += r.montant;
    if (!comptees.has(cle)) {
      comptees.add(cle);
      depense += depenseDuMois(portee, r.categorie);
    }
  }
  const reste = prevu - depense;
  const ratio = prevu > 0 ? Math.min(1, depense / prevu) : 0;
  const circonference = 2 * Math.PI * 40;
  const trait = ratio * circonference;
  document.getElementById("carte-reste").innerHTML = `
    <div class="anneau">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle class="piste" cx="48" cy="48" r="40" fill="none" stroke-width="9"/>
        <circle class="trait" cx="48" cy="48" r="40" fill="none" stroke-width="9"
          stroke-linecap="round" stroke-dasharray="${trait} ${circonference}"
          data-trait="${trait}" data-circ="${circonference}"/>
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

function remplirChoixBudget() {
  const portee = document.getElementById("budget-portee").value;
  const choix = document.getElementById("budget-categorie");
  choix.innerHTML = "";
  const liste = etat.categories.filter(c =>
    c.sens === "depense" && (c.portee === portee || c.portee === "tous"));
  for (const c of liste) {
    choix.innerHTML += `<option value="${echapper(c.id)}">${echapper(c.nom)}</option>`;
  }
}

function enregistrerBudget() {
  const portee = document.getElementById("budget-portee").value;
  const categorieId = document.getElementById("budget-categorie").value;
  const montant = eurosVersCentimes(document.getElementById("budget-montant").value);
  const message = document.getElementById("message-budget");
  if (!categorieId) {
    message.textContent = "Aucune catégorie : ajoutes-en une d'abord";
    return;
  }
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  const existant = etat.budgets.find(b =>
    b.portee === portee && b.categorie === categorieId);
  if (existant) {
    existant.montant = montant;
    message.textContent = "Budget mis à jour";
  } else {
    etat.budgets.push({ portee: portee, categorie: categorieId, montant: montant });
    message.textContent = "Budget ajouté";
  }
  document.getElementById("budget-montant").value = "";
  sauvegarder();
  rafraichir();
}

function trouverCategorieSimilaire(nom, sens, portee) {
  const n = normaliser(nom);
  if (n === "") return { exacte: null, proches: [] };
  const memeSens = etat.categories.filter(c =>
    c.sens === sens
    && (c.portee === portee || c.portee === "tous" || portee === "tous"));
  const exacte = memeSens.find(c => normaliser(c.nom) === n) || null;
  const proches = memeSens
    .filter(c => c !== exacte
      && (normaliser(c.nom).includes(n) || n.includes(normaliser(c.nom))))
    .slice(0, 3);
  return { exacte, proches };
}

function verifierNouvelleCategorie() {
  const nom = document.getElementById("categorie-nom").value;
  const sens = document.getElementById("categorie-sens").value;
  const portee = document.getElementById("categorie-portee").value;
  const message = document.getElementById("message-categorie");
  const { exacte, proches } = trouverCategorieSimilaire(nom, sens, portee);
  if (exacte) {
    message.textContent = "« " + exacte.nom + " » existe déjà.";
  } else if (proches.length > 0) {
    message.textContent = "Proche : " + proches.map(c => c.nom).join(", ")
      + ". Vérifie que ce n'est pas la même.";
  } else {
    message.textContent = "";
  }
}

document.getElementById("categorie-nom").addEventListener("input", verifierNouvelleCategorie);
document.getElementById("categorie-sens").addEventListener("change", verifierNouvelleCategorie);
document.getElementById("categorie-portee").addEventListener("change", verifierNouvelleCategorie);

function creerCategorie() {
  const nom = document.getElementById("categorie-nom").value.trim();
  const sens = document.getElementById("categorie-sens").value;
  const portee = document.getElementById("categorie-portee").value;
  const message = document.getElementById("message-categorie");
  if (nom === "") {
    message.textContent = "Donne un nom à la catégorie";
    return;
  }
   const { exacte } = trouverCategorieSimilaire(nom, sens, portee);
  if (exacte) {
    message.textContent = "« " + exacte.nom + " » existe déjà.";
    return;
  }
    const icone = document.getElementById("categorie-icone").value.trim().slice(0, 12);
  const nouvelle = { id: creerIdCategorie(nom), nom: nom, sens: sens, portee: portee };
  if (icone) nouvelle.icone = icone;
  etat.categories.push(nouvelle);
  document.getElementById("categorie-icone").value = "";
  message.textContent = "Catégorie ajoutée";
  document.getElementById("categorie-nom").value = "";
  sauvegarder();
  remplirChoixCategories();
  remplirChoixBudget();
  rafraichir();
}

function afficherCategories() {
  const zone = document.getElementById("liste-categories");
  const recherche = normaliser(document.getElementById("recherche-categorie").value);
  const NOMS_PORTEE = { perso: "Perso", commun: "Commun", tous: "Perso et commun" };
  document.getElementById("resume-categories").textContent =
    "Mes catégories (" + etat.categories.length + ")";
  const triees = [...etat.categories]
    .filter(c => normaliser(c.nom).includes(recherche))
    .sort((a, b) => a.sens.localeCompare(b.sens) || a.nom.localeCompare(b.nom, "fr"));
  if (triees.length === 0) {
    zone.innerHTML = `<div class="mu">Aucune catégorie trouvée</div>`;
    return;
  }
  zone.innerHTML = triees.map(c => `
    <div class="op">
      <div>${iconeCategorie(c.id)} ${echapper(c.nom)}<small>${c.sens === "revenu" ? "Revenu" : "Dépense"} · ${NOMS_PORTEE[c.portee] || c.portee}</small></div>
      <button class="supprimer" data-cat="${echapper(c.id)}" aria-label="Supprimer la catégorie">✕</button>
    </div>`).join("");
}

document.getElementById("recherche-categorie").addEventListener("input", afficherCategories);

function supprimerCategorie(e) {
  const id = e.target.dataset.cat;
  if (!id) return;
  const message = document.getElementById("message-categorie-liste");
  const utilisee = etat.operations.some(o => o.categorie === id)
    || etat.budgets.some(b => b.categorie === id);
  if (utilisee) {
    message.textContent = "Cette catégorie est utilisée (opérations ou budget) : retire d'abord le budget, elle ne peut pas être supprimée si des opérations l'utilisent.";
    return;
  }
  if (!confirm("Supprimer cette catégorie ?")) return;
  message.textContent = "";
  etat.categories = etat.categories.filter(c => c.id !== id);
  sauvegarder();
  remplirChoixCategories();
  remplirChoixBudget();
  rafraichir();
}

document.getElementById("bouton-categorie").addEventListener("click", creerCategorie);
document.getElementById("liste-categories").addEventListener("click", supprimerCategorie);
document.getElementById("budget-portee").addEventListener("change", remplirChoixBudget);

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
function virementsVersLeMois(compteId, mois = moisCourant()) {
  return etat.virements
    .filter(v => v.versId === compteId && v.date.startsWith(mois))
    .reduce((somme, v) => somme + v.montant, 0);
}

function remplirChoixPlan() {
  const choix = document.getElementById("plan-compte");
  choix.innerHTML = "";
  for (const c of comptesActifs().filter(c => c.type !== "courant")) {
    choix.innerHTML += `<option value="${c.id}">${echapper(c.nom)}</option>`;
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
    etat.plansEpargne.push({ id: "e" + Date.now(), compteId: compteId, montant: montant });
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

function afficherPlans() {
  dessinerPlans("liste-plans-livrets", c => c.type === "livret");
  dessinerPlans("liste-plans-placements", estPlacement);
}

function retirerPlan(e) {
  const id = e.target.dataset.plan;
  if (!id) return;
  if (!confirm("Retirer ce plan d'épargne ? Les virements déjà faits sont conservés.")) return;
  etat.plansEpargne = etat.plansEpargne.filter(p => p.id !== id);
  sauvegarder();
  rafraichir();
}

document.getElementById("bouton-plan").addEventListener("click", enregistrerPlan);
document.getElementById("liste-plans-livrets").addEventListener("click", retirerPlan);
document.getElementById("liste-plans-placements").addEventListener("click", retirerPlan);

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
  const date = document.getElementById("date-virement").value;
  const depuis = document.getElementById("virement-depuis").value;
  const vers = document.getElementById("virement-vers").value;
  const message = document.getElementById("message-virement");
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  if (!dateValide(date)) {
    message.textContent = "Date invalide (pas dans le futur)";
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
    date: date,
    note: document.getElementById("note-virement").value.trim().slice(0, 80)
  });
  document.getElementById("virement-montant").value = "";
  document.getElementById("panneau-saisie").hidden = true;
  sauvegarder();
  rafraichir();
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
         && ["depense", "revenu"].includes(c.sens)
         && (c.icone === undefined || (typeof c.icone === "string" && c.icone.length <= 12)))
    && (e.valorisations || []).every(v => idOk(v.id) && dateOk(v.date)
      && Number.isInteger(v.valeur) && ids.has(v.compteId))
      && (e.reglages === undefined || ([3, 4, 5, 6].includes(e.reglages.moisMatelas)
         && (e.reglages.dernierExport === undefined || dateOk(e.reglages.dernierExport))))
      && (e.objectifs || []).every(o => idOk(o.id) && montantOk(o.cible))
    && (e.misesDeCote || []).every(m => idOk(m.id) && dateOk(m.date)
      && montantOk(m.montant) && (e.objectifs || []).some(o => o.id === m.objectifId))
      && (e.badges || []).every(x => /^[a-z-]+$/.test(x.id) && dateOk(x.date))
      && (e.bilansVus || []).every(m => /^\d{4}-\d{2}$/.test(m))
       && (e.plansEpargne || []).every(p => idOk(p.id) && montantOk(p.montant) && ids.has(p.compteId))
    && e.operations.every(o => o.note === undefined
         || (typeof o.note === "string" && o.note.length <= 80))
    && e.virements.every(v => v.note === undefined
         || (typeof v.note === "string" && v.note.length <= 80))
             && (e.recurrentes || []).every(r => idOk(r.id) && montantOk(r.montant)
         && ["revenu", "depense"].includes(r.sens) && ids.has(r.compteId)
         && Number.isInteger(r.jour) && r.jour >= 1 && r.jour <= 31
         && /^\d{4}-\d{2}$/.test(r.debut) && /^[a-z0-9-]+$/.test(r.categorie)
         && Array.isArray(r.traites) && r.traites.every(m => /^\d{4}-\d{2}$/.test(m))
         && (r.note === undefined || (typeof r.note === "string" && r.note.length <= 80)));
}

function exporterSauvegarde() {
  etat.reglages.dernierExport = aujourdhui();
  sauvegarder();
  const contenu = JSON.stringify(
    { version: 1, exporteLe: new Date().toISOString(), etat: etat }, null, 2);
  const blob = new Blob([contenu], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = "budget-sauvegarde-" + new Date().toLocaleDateString("sv-SE") + ".json";
  lien.click();
  URL.revokeObjectURL(url);
  afficherRappels();
}

function importerSauvegarde(fichier) {
  const message = document.getElementById("message-sauvegarde");
  const lecteur = new FileReader();
  lecteur.onload = () => {
    try {
      const donnees = JSON.parse(lecteur.result);
      if (!etatValide(donnees.etat)) throw new Error("format");
      if (!confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) return;
      Object.assign(etat, { objectifs: [], misesDeCote: [], badges: [], bilansVus: [], plansEpargne: [], recurrentes: [] }, donnees.etat);
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
let operationEnEdition = null;

function dateValide(texte) {
  return /^\d{4}-\d{2}-\d{2}$/.test(texte) && texte <= aujourdhui();
}

function preparerSaisie() {
  recurrenceEnValidation = null;
  operationEnEdition = null;
  for (const id of ["date-operation", "date-virement"]) {
    const champ = document.getElementById(id);
    champ.value = aujourdhui();
    champ.max = aujourdhui();
  }
  document.getElementById("montant").value = "";
  document.getElementById("note-operation").value = "";
  document.getElementById("note-virement").value = "";
  document.getElementById("message").textContent = "";
  document.getElementById("bouton-ajouter").textContent = "Ajouter";
  document.getElementById("annuler-edition").hidden = true;
  document.getElementById("titre-edition").hidden = true;
  document.querySelector(".bascule").hidden = false;
  document.getElementById("titre-edition").textContent = "Modifier l'opération";
}

function ajouterOperation() {
  const montant = eurosVersCentimes(document.getElementById("montant").value);
  const date = document.getElementById("date-operation").value;
  const compteId = document.getElementById("choix-compte").value;
  const message = document.getElementById("message");
  if (isNaN(montant) || montant <= 0) {
    message.textContent = "Montant invalide";
    return;
  }
  if (!dateValide(date)) {
    message.textContent = "Date invalide (pas dans le futur)";
    return;
  }
  if (!compteId) {
    message.textContent = "Crée d'abord un compte (⚙ Réglages)";
    return;
  }
  message.textContent = "";
  const champs = {
    compteId: compteId,
    sens: document.getElementById("choix-sens").value,
    montant: montant,
    date: date,
    categorie: document.getElementById("choix-categorie").value,
    note: document.getElementById("note-operation").value.trim().slice(0, 80)
  };
  if (operationEnEdition) {
    const op = etat.operations.find(o => o.id === operationEnEdition);
    if (op) Object.assign(op, champs);
  } else {
    etat.operations.push({ id: "o" + Date.now(), ...champs });
  }
    if (recurrenceEnValidation) {
    const r = etat.recurrentes.find(x => x.id === recurrenceEnValidation.id);
    if (r && !r.traites.includes(recurrenceEnValidation.mois)) r.traites.push(recurrenceEnValidation.mois);
  }
  recurrenceEnValidation = null;
  operationEnEdition = null;
  document.getElementById("montant").value = "";
  document.getElementById("panneau-saisie").hidden = true;
  sauvegarder();
  rafraichir();
}

function ouvrirEdition(id) {
  const op = etat.operations.find(o => o.id === id);
  if (!op) return;
  const choixCompte = document.getElementById("choix-compte");
  choixCompte.value = op.compteId;
  if (choixCompte.value !== op.compteId) {
    montrerNotif("Ce compte est archivé : réactive-le pour modifier cette opération.");
    return;
  }
  preparerSaisie();
  operationEnEdition = id;
  afficherFormulaire("operation");
  document.getElementById("montant").value = (op.montant / 100).toFixed(2).replace(".", ",");
  document.getElementById("date-operation").value = op.date;
  document.getElementById("choix-sens").value = op.sens;
  remplirChoixCategories();
  document.getElementById("choix-categorie").value = op.categorie;
  document.getElementById("note-operation").value = op.note || "";
  document.getElementById("bouton-ajouter").textContent = "Enregistrer la modification";
  document.getElementById("annuler-edition").hidden = false;
  document.getElementById("titre-edition").hidden = false;
  document.querySelector(".bascule").hidden = true;
  document.getElementById("panneau-saisie").hidden = false;
}

function cliquerEdition(e) {
  const cible = e.target.closest("[data-edit]");
  if (cible) ouvrirEdition(cible.dataset.edit);
}

document.getElementById("liste-operations-perso").addEventListener("click", cliquerEdition);
document.getElementById("liste-operations-commun").addEventListener("click", cliquerEdition);
document.getElementById("annuler-edition").addEventListener("click", () => {
  document.getElementById("panneau-saisie").hidden = true;
  preparerSaisie();
});
function ligneOperation(op) {
  const compte = etat.comptes.find(c => c.id === op.compteId);
  const signe = op.sens === "revenu" ? "+" : "−";
  return `
    <div class="op">
      <i class="pastille cliquable" data-edit="${op.id}">${iconeCategorie(op.categorie)}</i>
      <div class="cliquable" data-edit="${op.id}">${nomCategorie(op.categorie)}<small>${op.date} · ${echapper(compte.nom)}</small>${op.note ? `<small>${echapper(op.note)}</small>` : ""}</div>
      <span class="${op.sens} cliquable" data-edit="${op.id}">${signe} ${centimesVersEuros(op.montant)}</span>
      <button class="supprimer" data-id="${op.id}" data-type="op" aria-label="Supprimer">✕</button>
    </div>`;
}

function ligneVirement(v) {
  const depuis = etat.comptes.find(c => c.id === v.depuisId);
  const vers = etat.comptes.find(c => c.id === v.versId);
  return `
    <div class="op">
      <i class="pastille">↔️</i>
      <div>Virement<small>${v.date} · ${echapper(depuis.nom)} → ${echapper(vers.nom)}</small>${v.note ? `<small>${echapper(v.note)}</small>` : ""}</div>
      <span>${centimesVersEuros(v.montant)}</span>
      <button class="supprimer" data-id="${v.id}" data-type="virement" aria-label="Supprimer">✕</button>
    </div>`;
}

function entreesPour(portee) {
  const entrees = [];
  for (const op of etat.operations) {
    if (porteeDuCompte(op.compteId) === portee) {
      entrees.push({ type: "op", date: op.date, id: op.id, donnee: op });
    }
  }
  for (const v of etat.virements) {
    if (porteeDuCompte(v.depuisId) === portee || porteeDuCompte(v.versId) === portee) {
      entrees.push({ type: "virement", date: v.date, id: v.id, donnee: v });
    }
  }
  return entrees.sort((a, b) =>
    b.date.localeCompare(a.date) || momentDe(b.id) - momentDe(a.id));
}

function afficherOperations() {
  for (const portee of ["perso", "commun"]) {
    document.getElementById("liste-operations-" + portee).innerHTML =
      entreesPour(portee).slice(0, 15)
        .map(e => e.type === "op" ? ligneOperation(e.donnee) : ligneVirement(e.donnee))
        .join("");
  }
}

function rafraichir() {
  afficherComptes();
  afficherOperations();
  afficherBudgets();
  afficherReste();
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
  afficherCategories();
  afficherPlans();
  afficherRappels();
  remplirFiltresMouvements();
  afficherMouvements();
  afficherAValider();
  afficherRecurrentes();
  remplirChoixCategoriesRec();
  afficherAnneaux();
  afficherCourbeEpargne();
}

function supprimerOperation(e) {
  const id = e.target.dataset.id;
  const type = e.target.dataset.type;
  if (!id) return;
  if (type === "virement") {
    if (!confirm("Supprimer ce virement ?")) return;
    etat.virements = etat.virements.filter(v => v.id !== id);
  } else {
    if (!confirm("Supprimer cette opération ?")) return;
    etat.operations = etat.operations.filter(op => op.id !== id);
  }
  sauvegarder();
  rafraichir();
}
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
 const plans = etat.plansEpargne.filter(p =>
    etat.comptes.some(c => c.id === p.compteId && !c.archive));
  const plansTenus = plans.filter(p => virementsVersLeMois(p.compteId, mois) >= p.montant).length;
  const plansTotal = plans.length;
  
return { revenus, depenses, epargne, respectes, pire, variation, badges, plansTenus, plansTotal,
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
   if (b.plansTotal > 0) {
    html += `<div class="ligne"><span>Plans d'épargne tenus</span><strong>${b.plansTenus} sur ${b.plansTotal}</strong></div>`;
  }
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
const JOURS_RAPPEL_EXPORT = 30;
const JOURS_RAPPEL_VALEUR = 35;

function joursDepuis(dateTexte) {
  return enJours(aujourdhui()) - enJours(dateTexte);
}

function dateDuMoment(ms) {
  return new Date(ms).toLocaleDateString("sv-SE");
}

function premiereUtilisation() {
  const moments = [];
  for (const liste of [etat.comptes, etat.operations, etat.virements,
                       etat.valorisations, etat.misesDeCote]) {
    for (const x of liste) {
      const m = momentDe(x.id);
      if (m > 1e12) moments.push(m);
    }
  }
  return moments.length > 0 ? dateDuMoment(Math.min(...moments)) : null;
}

function rappels() {
  const liste = [];
  const premiere = premiereUtilisation();
  const dernier = etat.reglages.dernierExport;
  if (premiere) {
    if (!dernier) {
      if (joursDepuis(premiere) >= 7) {
        liste.push({ texte: "Tu n'as encore jamais exporté de sauvegarde.", action: "export" });
      }
    } else if (joursDepuis(dernier) >= JOURS_RAPPEL_EXPORT) {
      liste.push({ texte: "Dernière sauvegarde : il y a " + joursDepuis(dernier) + " jours.", action: "export" });
    }
  }

  const anciens = [];
  for (const c of comptesActifs().filter(estPlacement)) {
    let derniere = null;
    for (const v of etat.valorisations) {
      if (v.compteId === c.id && (!derniere || v.date > derniere)) derniere = v.date;
    }
    if (!derniere && momentDe(c.id) > 1e12) derniere = dateDuMoment(momentDe(c.id));
    if (derniere && joursDepuis(derniere) >= JOURS_RAPPEL_VALEUR) {
      anciens.push({ compte: c, jours: joursDepuis(derniere) });
    }
  }
  if (anciens.length === 1) {
    liste.push({
      texte: "La valeur de « " + anciens[0].compte.nom + " » date de " + anciens[0].jours + " jours.",
      action: "valorisation",
      compteId: anciens[0].compte.id
    });
  } else if (anciens.length > 1) {
    liste.push({
      texte: "Valeurs à mettre à jour : "
        + anciens.map(a => a.compte.nom + " (" + a.jours + " j)").join(", ") + ".",
      action: "valorisation",
      compteId: anciens[0].compte.id
    });
  }
  return liste;
}

function afficherRappels() {
  document.getElementById("carte-rappels").innerHTML = rappels().map(r => `
    <div class="rappel">
      <span>${echapper(r.texte)}</span>
      <button type="button" class="lien-action" data-rappel="${r.action}"
        data-compte="${echapper(r.compteId || "")}">
        ${r.action === "export" ? "Exporter" : "Mettre à jour"}</button>
    </div>`).join("");
}

document.getElementById("carte-rappels").addEventListener("click", (e) => {
  const action = e.target.dataset.rappel;
  if (action === "export") exporterSauvegarde();
  if (action === "valorisation") {
    afficherVue("placements");
    const compteId = e.target.dataset.compte;
    if (compteId) document.getElementById("valo-compte").value = compteId;
  }
});
let mouvements = { portee: "perso", categorie: "", mois: "tous" };

function moisAvecMouvements(portee) {
  const mois = new Set([moisCourant()]);
  for (const e of entreesPour(portee)) mois.add(e.date.slice(0, 7));
  return [...mois].sort().reverse();
}

function texteRecherche(e) {
  if (e.type === "op") {
    const cat = etat.categories.find(c => c.id === e.donnee.categorie);
    const compte = etat.comptes.find(c => c.id === e.donnee.compteId);
    return normaliser((cat ? cat.nom : "") + " " + (compte ? compte.nom : "")
      + " " + (e.donnee.note || ""));
  }
  const de = etat.comptes.find(c => c.id === e.donnee.depuisId);
  const vers = etat.comptes.find(c => c.id === e.donnee.versId);
  return normaliser("virement " + (de ? de.nom : "") + " " + (vers ? vers.nom : "")
    + " " + (e.donnee.note || ""));
}

function remplirFiltresMouvements() {
  const m = mouvements;
  const selMois = document.getElementById("mouvements-mois");
  selMois.innerHTML = moisAvecMouvements(m.portee)
    .map(x => `<option value="${x}">${nomMois(x)}</option>`).join("")
    + `<option value="tous">Tous les mois</option>`;
  selMois.value = m.mois;
  const selCat = document.getElementById("mouvements-categorie");
  let html = `<option value="">Toutes les catégories</option>`
    + `<option value="__virements">Virements seulement</option>`;
  for (const c of etat.categories.filter(c => c.portee === m.portee || c.portee === "tous")) {
    html += `<option value="${echapper(c.id)}">${echapper(c.nom)}${c.sens === "revenu" ? " (revenu)" : ""}</option>`;
  }
  selCat.innerHTML = html;
  selCat.value = m.categorie;
}

function afficherMouvements() {
  const m = mouvements;
  const recherche = normaliser(document.getElementById("mouvements-recherche").value);
  let entrees = entreesPour(m.portee);
  if (m.mois !== "tous") entrees = entrees.filter(e => e.date.startsWith(m.mois));
  if (m.categorie === "__virements") {
    entrees = entrees.filter(e => e.type === "virement");
  } else if (m.categorie) {
    entrees = entrees.filter(e => e.type === "op" && e.donnee.categorie === m.categorie);
  }
  if (recherche) entrees = entrees.filter(e => texteRecherche(e).includes(recherche));

  const ops = entrees.filter(e => e.type === "op").map(e => e.donnee);
  const depenses = somme(ops.filter(o => o.sens === "depense"));
  const revenus = somme(ops.filter(o => o.sens === "revenu"));
  let resume = `<div class="mu">${entrees.length} mouvement${entrees.length > 1 ? "s" : ""}</div>`
    + ligneMontant("Dépenses", depenses) + ligneMontant("Revenus", revenus);
  const budget = (m.categorie && m.categorie !== "__virements" && m.mois !== "tous" && !recherche)
    ? etat.budgets.find(b => b.portee === m.portee && b.categorie === m.categorie) : null;
  if (budget) {
    const ratio = depenses / budget.montant;
    const pct = Math.min(100, Math.round(ratio * 100));
    resume += `
      <div class="ligne"><span>Plafond du mois</span><strong>${centimesVersEuros(budget.montant)}</strong></div>
      <div class="jauge"><div class="jauge-remplie ${ratio >= SEUIL_ALERTE ? "alerte" : ""}" style="width:${pct}%"></div></div>`;
  }
  document.getElementById("mouvements-total").innerHTML = resume;

  const zone = document.getElementById("liste-mouvements");
  if (entrees.length === 0) {
    zone.innerHTML = `<div class="mu">Aucun mouvement.</div>`;
    return;
  }
  zone.innerHTML = entrees.slice(0, 100)
    .map(e => e.type === "op" ? ligneOperation(e.donnee) : ligneVirement(e.donnee))
    .join("")
    + (entrees.length > 100
      ? `<div class="mu">100 premiers affichés sur ${entrees.length} : affine avec la recherche.</div>` : "");
}

function ouvrirMouvements(portee, categorie = "", mois = "tous") {
  mouvements = { portee: portee, categorie: categorie, mois: mois };
  document.getElementById("mouvements-recherche").value = "";
  document.getElementById("titre-mouvements").textContent =
    portee === "commun" ? "Mouvements du commun" : "Mes mouvements";
  afficherVue("mouvements");
  remplirFiltresMouvements();
  afficherMouvements();
}

function cliquerBudget(e) {
  if (e.target.closest("button")) return;
  const carte = e.target.closest("[data-detail]");
  if (!carte) return;
  const [portee, categorie] = carte.dataset.detail.split(":");
  ouvrirMouvements(portee, categorie, moisCourant());
}

document.addEventListener("click", (e) => {
  const bouton = e.target.closest("[data-mouvements]");
  if (bouton) ouvrirMouvements(bouton.dataset.mouvements, "", moisCourant());
});
document.getElementById("liste-budgets-perso").addEventListener("click", cliquerBudget);
document.getElementById("liste-budgets-commun").addEventListener("click", cliquerBudget);
document.getElementById("liste-mouvements").addEventListener("click", supprimerOperation);
document.getElementById("liste-mouvements").addEventListener("click", cliquerEdition);
document.getElementById("mouvements-mois").addEventListener("change", (e) => {
  mouvements.mois = e.target.value;
  afficherMouvements();
});
document.getElementById("mouvements-categorie").addEventListener("change", (e) => {
  mouvements.categorie = e.target.value;
  afficherMouvements();
});
document.getElementById("mouvements-recherche").addEventListener("input", afficherMouvements);
document.getElementById("fermer-mouvements").addEventListener("click", () => afficherVue(vuePrecedente));

let recurrenceEnValidation = null;

function dernierJourDuMois(mois) {
  const [a, m] = mois.split("-").map(Number);
  return new Date(a, m, 0).getDate();
}

function dateEcheance(mois, jour) {
  const j = Math.min(jour, dernierJourDuMois(mois));
  return mois + "-" + String(j).padStart(2, "0");
}

function moisEntre(debut, fin) {
  const liste = [];
  let [a, m] = debut.split("-").map(Number);
  const [af, mf] = fin.split("-").map(Number);
  while (a < af || (a === af && m <= mf)) {
    liste.push(a + "-" + String(m).padStart(2, "0"));
    m++;
    if (m > 12) { m = 1; a++; }
  }
  return liste;
}

function aValider() {
  const liste = [];
  for (const r of etat.recurrentes) {
    const compte = etat.comptes.find(c => c.id === r.compteId);
    if (!compte || compte.archive) continue;
    for (const mois of moisEntre(r.debut, moisCourant())) {
      if (r.traites.includes(mois)) continue;
      const date = dateEcheance(mois, r.jour);
      if (date <= aujourdhui()) liste.push({ r: r, mois: mois, date: date });
    }
  }
  return liste.sort((x, y) => x.date.localeCompare(y.date));
}

function afficherAValider() {
  const zone = document.getElementById("carte-a-valider");
  const items = aValider();
  if (items.length === 0) {
    zone.innerHTML = "";
    return;
  }
  zone.innerHTML = `<h2>À valider</h2>` + items.map(({ r, mois, date }) => {
    const signe = r.sens === "revenu" ? "+" : "−";
    const boutons = ["valider", "modifier", "passer"].map(act => `
      <button type="button" class="lien-action" data-rec="${r.id}" data-mois="${mois}" data-act="${act}">
        ${act === "valider" ? "Valider" : act === "modifier" ? "Modifier" : "Passer"}</button>`).join("");
    return `
      <div class="budget">
        <div class="budget-ligne">
          <span>${iconeCategorie(r.categorie)} ${nomCategorie(r.categorie)}${r.note ?" · " + echapper(r.note) : ""}</span>
          <span>${signe} ${centimesVersEuros(r.montant)}</span>
        </div>
        <small class="mu">Prévu le ${date}</small>
        <div class="actions-rec">${boutons}</div>
      </div>`;
  }).join("");
}

function ouvrirRecurrence(r, mois) {
  const choixCompte = document.getElementById("choix-compte");
  choixCompte.value = r.compteId;
  if (choixCompte.value !== r.compteId) return;
  preparerSaisie();
  recurrenceEnValidation = { id: r.id, mois: mois };
  afficherFormulaire("operation");
  document.getElementById("montant").value = (r.montant / 100).toFixed(2).replace(".", ",");
  document.getElementById("date-operation").value = dateEcheance(mois, r.jour);
  document.getElementById("choix-sens").value = r.sens;
  remplirChoixCategories();
  document.getElementById("choix-categorie").value = r.categorie;
  document.getElementById("note-operation").value = r.note || "";
  document.getElementById("bouton-ajouter").textContent = "Valider";
  document.getElementById("titre-edition").textContent = "Valider l'opération prévue";
  document.getElementById("titre-edition").hidden = false;
  document.getElementById("annuler-edition").hidden = false;
  document.querySelector(".bascule").hidden = true;
  document.getElementById("panneau-saisie").hidden = false;
}

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
    etat.operations.push({
      id: "o" + Date.now(), compteId: r.compteId, sens: r.sens, montant: r.montant,
      date: dateEcheance(mois, r.jour), categorie: r.categorie, note: r.note || ""
    });
  }
  r.traites.push(mois);
  sauvegarder();
  rafraichir();
});

function remplirChoixRecurrence() {
  const choix = document.getElementById("rec-compte");
  const memoire = choix.value;
  choix.innerHTML = comptesActifs().filter(c => !estPlacement(c))
    .map(c => `<option value="${c.id}">${echapper(c.nom)}</option>`).join("");
  if (memoire) choix.value = memoire;
  remplirChoixCategoriesRec();
}

function remplirChoixCategoriesRec() {
  const compteId = document.getElementById("rec-compte").value;
  const sens = document.getElementById("rec-sens").value;
  const choix = document.getElementById("rec-categorie");
  const memoire = choix.value;
  choix.innerHTML = compteId
    ? categoriesPour(compteId, sens)
        .map(c => `<option value="${echapper(c.id)}">${echapper(c.nom)}</option>`).join("")
    : "";
  if (memoire) choix.value = memoire;
}

function enregistrerRecurrence() {
  const compteId = document.getElementById("rec-compte").value;
  const sens = document.getElementById("rec-sens").value;
  const categorie = document.getElementById("rec-categorie").value;
  const montant = eurosVersCentimes(document.getElementById("rec-montant").value);
  const jour = Number(document.getElementById("rec-jour").value);
  const message = document.getElementById("message-recurrence");
  if (!compteId || !categorie) {
    message.textContent = "Choisis un compte et une catégorie";
    return;
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
    id: "r" + Date.now(), compteId: compteId, sens: sens, categorie: categorie,
    montant: montant, jour: jour,
    note: document.getElementById("rec-note").value.trim().slice(0, 80),
    debut: document.getElementById("rec-debut").value === "suivant" ? moisDecale(1) : moisCourant(),
    traites: []
  });
  message.textContent = "Opération récurrente ajoutée";
  document.getElementById("rec-montant").value = "";
  document.getElementById("rec-jour").value = "";
  document.getElementById("rec-note").value = "";
  sauvegarder();
  rafraichir();
}

function afficherRecurrentes() {
  const zone = document.getElementById("liste-recurrentes");
  if (etat.recurrentes.length === 0) {
    zone.innerHTML = `<div class="mu">Aucune opération récurrente.</div>`;
    return;
  }
  zone.innerHTML = etat.recurrentes.map(r => {
    const compte = etat.comptes.find(c => c.id === r.compteId);
    const signe = r.sens === "revenu" ? "+" : "−";
    return `
      <div class="op">
        <div>${nomCategorie(r.categorie)}<small>Le ${r.jour} de chaque mois · ${compte ? echapper(compte.nom) : "?"}</small>${r.note ? `<small>${echapper(r.note)}</small>` : ""}</div>
        <span>${signe} ${centimesVersEuros(r.montant)}</span>
        <button class="supprimer" data-rec-supp="${r.id}" aria-label="Supprimer">✕</button>
      </div>`;
  }).join("");
}

document.getElementById("liste-recurrentes").addEventListener("click", (e) => {
  const id = e.target.dataset.recSupp;
  if (!id) return;
  if (!confirm("Supprimer cette opération récurrente ? Les opérations déjà créées sont conservées.")) return;
  etat.recurrentes = etat.recurrentes.filter(r => r.id !== id);
  sauvegarder();
  rafraichir();
});

document.getElementById("bouton-recurrence").addEventListener("click", enregistrerRecurrence);
document.getElementById("rec-compte").addEventListener("change", remplirChoixCategoriesRec);
document.getElementById("rec-sens").addEventListener("change", remplirChoixCategoriesRec);
const ICONES_DEFAUT = {
  "logement": "🏠", "courses": "🛒", "electricite": "⚡", "eau": "💧", "internet": "📶",
  "assurances": "🛡️", "sante": "🩺", "animaux": "🐾", "sorties": "🎉",
  "carburant": "⛽", "telephone": "📱", "assurance-voiture": "🚗", "loisirs": "🎮",
  "anniversaires": "🎁", "restaurants": "🍽️", "abonnements": "🔁", "autre": "🏷️",
  "salaire": "💼", "primes": "🎯", "remboursements": "↩️", "revente": "🔄", "autre-revenu": "💶"
};
const ICONES_TYPES = { "courant": "💳", "livret": "🐷", "pea": "📈", "assurance-vie": "🛡️" };

function iconeCategorie(id) {
  const cat = etat.categories.find(c => c.id === id);
  return echapper((cat && cat.icone) || ICONES_DEFAUT[id] || "🏷️");
}

function iconeType(type) {
  return ICONES_TYPES[type] || "💰";
}

function eurosRonds(centimes) {
  return (centimes / 100).toLocaleString("fr-FR",
    { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function moisCourt(mois) {
  const [a, m] = mois.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

/* ----- Anneau des dépenses ----- */
function depensesParCategorie(portee, mois = moisCourant()) {
  const totaux = {};
  for (const op of etat.operations) {
    if (op.sens !== "depense" || !op.date.startsWith(mois)) continue;
    if (porteeDuCompte(op.compteId) !== portee) continue;
    totaux[op.categorie] = (totaux[op.categorie] || 0) + op.montant;
  }
  return Object.entries(totaux)
    .map(([categorie, montant]) => ({ categorie: categorie, montant: montant }))
    .sort((a, b) => b.montant - a.montant);
}

function afficherAnneaux() {
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

/* ----- Courbe de l'épargne ----- */
function soldeAu(compte, date) {
  let solde = compte.soldeDepart;
  if (estPlacement(compte)) {
    let ref = null;
    for (const v of etat.valorisations) {
      if (v.compteId !== compte.id || v.date > date) continue;
      if (!ref || v.date > ref.date
          || (v.date === ref.date && momentDe(v.id) > momentDe(ref.id))) ref = v;
    }
    if (ref) solde = ref.valeur;
    for (const v of etat.virements) {
      if (v.date > date || (ref && v.date <= ref.date)) continue;
      if (v.versId === compte.id) solde += v.montant;
      if (v.depuisId === compte.id) solde -= v.montant;
    }
    return solde;
  }
  for (const op of etat.operations) {
    if (op.compteId !== compte.id || op.date > date) continue;
    solde += op.sens === "revenu" ? op.montant : -op.montant;
  }
  for (const v of etat.virements) {
    if (v.date > date) continue;
    if (v.versId === compte.id) solde += v.montant;
    if (v.depuisId === compte.id) solde -= v.montant;
  }
  return solde;
}

function debutHistorique() {
  const dates = toutesLesDates();
  for (const c of etat.comptes) {
    if (momentDe(c.id) > 1e12) dates.push(dateDuMoment(momentDe(c.id)));
  }
  return dates.length > 0 ? dates.sort()[0].slice(0, 7) : null;
}

function serieEpargne() {
  const debut = debutHistorique();
  if (!debut) return [];
  return moisEntre(debut, moisCourant()).slice(-12).map(m => {
    if (m === moisCourant()) {
      return { mois: m, valeur: totalPar(c => c.type !== "courant") };
    }
    const date = m + "-" + String(dernierJourDuMois(m)).padStart(2, "0");
    let total = 0;
    for (const c of etat.comptes) {
      if (c.type !== "courant") total += soldeAu(c, date);
    }
    return { mois: m, valeur: total };
  });
}

function afficherCourbeEpargne() {
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

document.getElementById("graphique-perso").addEventListener("click", cliquerBudget);
document.getElementById("graphique-commun").addEventListener("click", cliquerBudget);
const CLE_THEME = "budget-theme";
const NOMS_THEMES = ["bleu-rose", "sombre", "pastel", "ludique"];

function themeEnregistre() {
  try { return localStorage.getItem(CLE_THEME) || "bleu-rose"; }
  catch (e) { return "bleu-rose"; }
}

function appliquerTheme(nom) {
  if (!NOMS_THEMES.includes(nom)) nom = "bleu-rose";
  document.documentElement.setAttribute("data-theme", nom);
  try { localStorage.setItem(CLE_THEME, nom); } catch (e) {}
  const fond = getComputedStyle(document.documentElement).getPropertyValue("--fond").trim();
  document.querySelector('meta[name="theme-color"]').setAttribute("content", fond);
  document.getElementById("choix-theme").value = nom;
}

document.getElementById("choix-theme").addEventListener("change", (e) => appliquerTheme(e.target.value));
const VUES = ["accueil", "perso", "commun", "livrets", "placements", "reglages", "mouvements"];
let vuePrecedente = "accueil";

function afficherVue(nom) {
  if (nom !== "reglages" && nom !== "mouvements") vuePrecedente = nom;
  for (const v of VUES) {
    document.getElementById("vue-" + v).hidden = (v !== nom);
  }
  const actif = nom === "mouvements" ? vuePrecedente : nom;
  for (const b of document.querySelectorAll(".barre button")) {
    b.classList.toggle("actif", b.dataset.vue === actif);
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
  preparerSaisie();
  afficherFormulaire("operation");
  document.getElementById("panneau-saisie").hidden = false;
});
document.getElementById("fermer-saisie").addEventListener("click", () => {
  document.getElementById("panneau-saisie").hidden = true;
  preparerSaisie();
});
document.getElementById("onglet-operation").addEventListener("click", () => afficherFormulaire("operation"));
document.getElementById("onglet-virement").addEventListener("click", () => afficherFormulaire("virement"));
document.getElementById("bouton-compte").addEventListener("click", creerCompte);
document.getElementById("bouton-ajouter").addEventListener("click", ajouterOperation);
document.getElementById("bouton-virement").addEventListener("click", ajouterVirement);
document.getElementById("liste-operations-perso").addEventListener("click", supprimerOperation);
document.getElementById("liste-operations-commun").addEventListener("click", supprimerOperation);
appliquerTheme(themeEnregistre());
charger();
remplirChoixComptes();
remplirChoixCategories();
majChampVerse();
remplirChoixBudget();
rafraichir();
afficherVue("accueil");
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
