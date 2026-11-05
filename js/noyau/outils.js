// Petits outils sans lien avec l'appli : formats d'argent, échappement HTML, texte.

export function centimesVersEuros(c) {
  return (c / 100).toLocaleString("fr-FR",
    { style: "currency", currency: "EUR" });
}

export function echapper(texte) {
  return String(texte)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function momentDe(id) {
  return Number(id.slice(1)) || 0;
}

export function eurosVersCentimes(texte) {
  const propre = String(texte).replace(/[\s\u00a0\u202f€]/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(propre)) return NaN;
  return Math.round(parseFloat(propre) * 100);
}

export function normaliser(texte) {
  return texte.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function ligneMontant(nom, montant) {
  return `<div class="ligne"><span>${echapper(nom)}</span><strong>${centimesVersEuros(montant)}</strong></div>`;
}

export function somme(liste) {
  return liste.reduce((s, x) => s + x.montant, 0);
}

export function eurosRonds(centimes) {
  return (centimes / 100).toLocaleString("fr-FR",
    { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
