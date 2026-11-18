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

// Ancien format d'identifiant : une lettre + l'heure de création (ex. "o1730000000000").
// Ne sert plus qu'à la migration des anciennes données (voir migrerCreeLe).
export function momentDe(id) {
  return Number(id.slice(1)) || 0;
}

// Identifiant unique : une lettre (le type) + 16 caractères hexadécimaux au hasard.
// 64 bits aléatoires : deux appareils ne produiront pas le même identifiant.
export function nouvelId(prefixe) {
  const octets = new Uint8Array(8);
  crypto.getRandomValues(octets);
  return prefixe + Array.from(octets, o => o.toString(16).padStart(2, "0")).join("");
}

// Les deux champs communs à tout nouvel enregistrement :
// l'identifiant et la date de création (en millisecondes).
export function nouvelEnregistrement(prefixe) {
  return { id: nouvelId(prefixe), creeLe: Date.now() };
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
