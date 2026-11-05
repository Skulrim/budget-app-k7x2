// Catégories : recherche, icônes, identifiants, détection de doublons.

import { porteeDuCompte } from "./comptes.js";
import { etat } from "./etat.js";
import { echapper, normaliser } from "./outils.js";

export function categoriesPour(compteId, sens) {
  const portee = porteeDuCompte(compteId);
  return etat.categories.filter(cat =>
    cat.sens === sens && (cat.portee === portee || cat.portee === "tous"));
}

export function nomCategorie(id) {
  const cat = etat.categories.find(c => c.id === id);
  return echapper(cat ? cat.nom : id);
}

export function creerIdCategorie(nom) {
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

export function trouverCategorieSimilaire(nom, sens, portee) {
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

const ICONES_DEFAUT = {
  "logement": "🏠", "courses": "🛒", "electricite": "⚡", "eau": "💧", "internet": "📶",
  "assurances": "🛡️", "sante": "🩺", "animaux": "🐾", "sorties": "🎉",
  "carburant": "⛽", "telephone": "📱", "assurance-voiture": "🚗", "loisirs": "🎮",
  "anniversaires": "🎁", "restaurants": "🍽️", "abonnements": "🔁", "autre": "🏷️",
  "salaire": "💼", "primes": "🎯", "remboursements": "↩️", "revente": "🔄", "autre-revenu": "💶"
};

export function iconeCategorie(id) {
  const cat = etat.categories.find(c => c.id === id);
  return echapper((cat && cat.icone) || ICONES_DEFAUT[id] || "🏷️");
}
