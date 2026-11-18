// L'état de l'appli (comptes, opérations, budgets…) et sa sauvegarde dans le navigateur.

import { espaceDe, idsCommun } from "./espaces.js";
import { momentDe } from "./outils.js";

export const etat = {
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
  valorisations: [],
  ajustements: [],
  suppressions: []
};

const CLE = "budget-etat-v1";

export function sauvegarder() {
  suivreChangements(false);
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch (e) {
    console.error("Sauvegarde impossible", e);
  }
  for (const f of ecouteurs) f();
}

export function charger() {
  try {
    const texte = localStorage.getItem(CLE);
    if (texte) Object.assign(etat, JSON.parse(texte));
    const migre = migrerCreeLe();
    const suivi = suivreChangements(true);
    if (migre || suivi) sauvegarder();
  } catch (e) {
    console.error("Lecture impossible", e);
  }
}

const LISTES_AVEC_ID = ["comptes", "operations", "virements", "valorisations",
  "misesDeCote", "plansEpargne", "recurrentes", "objectifs", "ajustements"];

// Donne un champ creeLe aux anciens enregistrements, à partir de l'heure
// contenue dans leur ancien identifiant. Les identifiants existants ne changent pas :
// les liens (compteId, objectifId…) restent donc valables. Sans effet si déjà fait.
export function migrerCreeLe() {
  let modifie = false;
  for (const nom of LISTES_AVEC_ID) {
    for (const x of etat[nom] || []) {
      if (!Number.isInteger(x.creeLe)) {
        x.creeLe = momentDe(x.id);
        modifie = true;
      }
    }
  }
  return modifie;
}

// ===== Suivi des modifications (préparation de la synchronisation) =====
// Chaque enregistrement suivi reçoit modifieLe (ms) à chaque création ou changement.
// Chaque suppression laisse une trace dans etat.suppressions, pour qu'un autre appareil
// sache qu'il faut supprimer aussi (au lieu de ressusciter la donnée).
// Tout passe par sauvegarder() : aucun autre module n'a besoin d'être modifié.

export const LISTES_SUIVIES = [...LISTES_AVEC_ID, "categories", "budgets"];
const AGE_MAX_SUPPRESSION = 180 * 24 * 3600 * 1000;
const empreintes = new Map(); // "liste|clé" -> contenu de l'enregistrement (sans modifieLe)
const espaces = new Map();    // "liste|clé" -> "perso", "commun" ou "mixte"

export function cleDe(liste, x) {
  return liste === "budgets" ? x.portee + ":" + x.categorie : x.id;
}

function sansModif(cle, valeur) {
  return cle === "modifieLe" ? undefined : valeur;
}

// initial = true au chargement : on prend l'état actuel comme point de départ, sans le marquer modifié.
// Renvoie true si des champs ont été ajoutés ou changés (il faut alors sauvegarder).
function suivreChangements(initial) {
  const maintenant = Date.now();
  let modifie = false;
  if (!Array.isArray(etat.suppressions)) etat.suppressions = [];
  const vus = new Set();
  const communs = idsCommun(etat.comptes);
  for (const liste of LISTES_SUIVIES) {
    for (const x of etat[liste] || []) {
      const cle = cleDe(liste, x);
      const ref = liste + "|" + cle;
      vus.add(ref);
      const espaceAvant = espaces.get(ref);
      const espaceApres = espaceDe(liste, x, communs);
      espaces.set(ref, espaceApres);
      if (espaceAvant && espaceAvant !== espaceApres) {
        // on annule une éventuelle suppression « commun » en attente (retour en arrière)
        etat.suppressions = etat.suppressions.filter(s => !(s.liste === liste && s.cle === cle && s.espace === "commun"));
        // virement qui n'est plus partagé : on demande d'effacer sa copie dans le commun
        if (espaceAvant === "mixte" && espaceApres === "perso") {
          etat.suppressions.push({ liste: liste, cle: cle, le: maintenant, espace: "commun" });
          modifie = true;
        }
      }
      const texte = JSON.stringify(x, sansModif);
      const avant = empreintes.get(ref);
      if (avant === undefined) {
        if (!Number.isInteger(x.modifieLe)) {
          x.modifieLe = initial ? (Number.isInteger(x.creeLe) ? x.creeLe : 0) : maintenant;
          modifie = true;
        }
        if (!initial) {
          etat.suppressions = etat.suppressions.filter(s => !(s.liste === liste && s.cle === cle));
        }
      } else if (avant !== texte) {
        x.modifieLe = maintenant;
        modifie = true;
      }
      // Enregistrement sans date (ex. sauvegarde ancienne importée) : on lui en donne une
      if (!Number.isInteger(x.modifieLe)) {
        x.modifieLe = Number.isInteger(x.creeLe) ? x.creeLe : 0;
        modifie = true;
      }
      empreintes.set(ref, texte);
    }
  }
  for (const ref of [...empreintes.keys()]) {
    if (vus.has(ref)) continue;
    empreintes.delete(ref);
    const espace = espaces.get(ref) || "perso";
    espaces.delete(ref);
    const [liste, ...reste] = ref.split("|");
    etat.suppressions.push({ liste: liste, cle: reste.join("|"), le: maintenant, espace: espace });
    modifie = true;
  }
  const avantNettoyage = etat.suppressions.length;
  etat.suppressions = etat.suppressions.filter(s => s.le > maintenant - AGE_MAX_SUPPRESSION);
  if (etat.suppressions.length !== avantNettoyage) modifie = true;
  return modifie;
}

// ===== Branchement de la synchronisation =====

const ecouteurs = [];

// La synchronisation s'inscrit ici pour être prévenue après chaque sauvegarde locale
export function surSauvegarde(fonction) {
  ecouteurs.push(fonction);
}

// Applique un changement venu du cloud sans le compter comme une modification locale
// (pas de nouvelle date, pas de trace de suppression, donc pas de renvoi inutile).
// donnee = null : supprime l'enregistrement. Renvoie true si l'état a changé.
export function appliquerChangementDistant(liste, cle, donnee, modifieLe) {
  if (!LISTES_SUIVIES.includes(liste)) return false;
  if (!Array.isArray(etat[liste])) etat[liste] = [];
  const tableau = etat[liste];
  const i = tableau.findIndex(x => cleDe(liste, x) === cle);
  const ref = liste + "|" + cle;
  if (donnee === null) {
    if (i === -1) return false;
    tableau.splice(i, 1);
    empreintes.delete(ref);
    espaces.delete(ref);
    return true;
  }
  const nouveau = { ...donnee, modifieLe: modifieLe };
  if (i === -1) tableau.push(nouveau);
  else tableau[i] = nouveau;
  empreintes.set(ref, JSON.stringify(nouveau, sansModif));
  etat.suppressions = etat.suppressions.filter(s => !(s.liste === liste && s.cle === cle));
  return true;
}

// Espace d'un enregistrement : "perso", "commun" (partagé) ou "mixte" (virement entre un compte perso et un compte commun)
export function espaceConnu(liste, cle) {
  return espaces.get(liste + "|" + cle);
}

export function referencesParEspace(espace) {
  const refs = [];
  for (const [ref, e] of espaces) {
    if (e !== espace) continue;
    const [liste, ...reste] = ref.split("|");
    refs.push({ liste: liste, cle: reste.join("|") });
  }
  return refs;
}
