// Tout le calcul de dates et de mois (aucun accès au DOM).

export function moisCourant() {
  return new Date().toLocaleDateString("sv-SE").slice(0, 7);
}

export function joursRestants() {
  const d = new Date();
  const dernierJour = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return dernierJour - d.getDate();
}

export function moisDecale(decalage) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + decalage);
  return d.toLocaleDateString("sv-SE").slice(0, 7);
}

export function dateValide(texte) {
  return /^\d{4}-\d{2}-\d{2}$/.test(texte) && texte <= aujourdhui();
}

export function aujourdhui() {
  return new Date().toLocaleDateString("sv-SE");
}

export function enJours(dateTexte) {
  const [a, m, j] = dateTexte.split("-").map(Number);
  return Math.floor(Date.UTC(a, m - 1, j) / 86400000);
}

export function debutSemaine(dateTexte) {
  const n = enJours(dateTexte);
  return n - ((n + 3) % 7);
}

export function moisPrecedent(mois) {
  const [a, m] = mois.split("-").map(Number);
  return new Date(a, m - 2, 1).toLocaleDateString("sv-SE").slice(0, 7);
}

export function nomMois(mois) {
  const [a, m] = mois.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function joursDepuis(dateTexte) {
  return enJours(aujourdhui()) - enJours(dateTexte);
}

export function dateDuMoment(ms) {
  return new Date(ms).toLocaleDateString("sv-SE");
}

export function dernierJourDuMois(mois) {
  const [a, m] = mois.split("-").map(Number);
  return new Date(a, m, 0).getDate();
}

export function dateEcheance(mois, jour) {
  const j = Math.min(jour, dernierJourDuMois(mois));
  return mois + "-" + String(j).padStart(2, "0");
}

export function moisEntre(debut, fin) {
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

export function moisCourt(mois) {
  const [a, m] = mois.split("-").map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}
