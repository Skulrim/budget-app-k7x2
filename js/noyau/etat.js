// L'état de l'appli (comptes, opérations, budgets…) et sa sauvegarde dans le navigateur.

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
  valorisations: []
};

const CLE = "budget-etat-v1";

export function sauvegarder() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch (e) {
    console.error("Sauvegarde impossible", e);
  }
}

export function charger() {
  try {
    const texte = localStorage.getItem(CLE);
    if (texte) Object.assign(etat, JSON.parse(texte));
  } catch (e) {
    console.error("Lecture impossible", e);
  }
}
