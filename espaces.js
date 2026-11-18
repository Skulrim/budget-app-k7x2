// À quel espace appartient chaque enregistrement ? (aucun accès à l'état, aucun DOM)
//   "perso"  : privé, visible par moi seul
//   "commun" : partagé avec l'autre personne du foyer
//   "mixte"  : virement entre un compte perso et un compte commun (complet chez moi,
//              et une copie « versement de Prénom » sans mon compte source dans le commun)

// Identifiants des comptes communs (le compte « externe » représente l'autre personne dans le commun)
export function idsCommun(comptes) {
  const ids = new Set();
  for (const c of comptes || []) {
    if (c.proprietaire === "commun" || c.type === "externe") ids.add(c.id);
  }
  return ids;
}

function espaceVirement(depuisId, versId, communs) {
  const a = communs.has(depuisId);
  const b = communs.has(versId);
  return a && b ? "commun" : (a || b ? "mixte" : "perso");
}

export function espaceDe(liste, x, communs) {
  switch (liste) {
    case "comptes": return communs.has(x.id) ? "commun" : "perso";
    case "operations":
    case "valorisations":
    case "ajustements":
    case "plansEpargne": return communs.has(x.compteId) ? "commun" : "perso";
    case "virements": return espaceVirement(x.depuisId, x.versId, communs);
    case "recurrentes":
      return x.type === "virement"
        ? espaceVirement(x.depuisId, x.versId, communs)
        : (communs.has(x.compteId) ? "commun" : "perso");
    case "categories":
    case "budgets": return (x.portee === "commun") ? "commun" : "perso";
    default: return "perso"; // objectifs d'achat, mises de côté : toujours privés
  }
}
