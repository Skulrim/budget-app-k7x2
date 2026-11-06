// Contrôle du format d'une sauvegarde importée.

export function etatValide(e) {
  if (!e || !Array.isArray(e.comptes) || !Array.isArray(e.operations)
    || !Array.isArray(e.virements)) return false;
  const dateOk = d => /^\d{4}-\d{2}-\d{2}$/.test(d);
  const idOk = id => /^[a-z][a-z0-9]+$/.test(id);
  const montantOk = m => Number.isInteger(m) && m > 0;
  const creeOk = x => x.creeLe === undefined || Number.isInteger(x.creeLe);
  const listes = ["comptes", "operations", "virements", "valorisations",
    "misesDeCote", "plansEpargne", "recurrentes", "objectifs", "ajustements"];
  if (!listes.every(nom => (e[nom] || []).every(creeOk))) return false;
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
      && Number.isInteger(m.montant) && m.montant !== 0
      && (e.objectifs || []).some(o => o.id === m.objectifId))
      && (e.badges || []).every(x => /^[a-z-]+$/.test(x.id) && dateOk(x.date))
      && (e.bilansVus || []).every(m => /^\d{4}-\d{2}$/.test(m))
       && (e.plansEpargne || []).every(p => idOk(p.id) && montantOk(p.montant) && ids.has(p.compteId))
    && (e.ajustements || []).every(a => idOk(a.id) && dateOk(a.date)
      && Number.isInteger(a.montant) && a.montant !== 0 && ids.has(a.compteId))
    && e.operations.every(o => o.note === undefined
         || (typeof o.note === "string" && o.note.length <= 80))
    && e.virements.every(v => v.note === undefined
         || (typeof v.note === "string" && v.note.length <= 80))
    && (e.recurrentes || []).every(r => idOk(r.id) && montantOk(r.montant)
         && Number.isInteger(r.jour) && r.jour >= 1 && r.jour <= 31
         && /^\d{4}-\d{2}$/.test(r.debut)
         && Array.isArray(r.traites) && r.traites.every(m => /^\d{4}-\d{2}$/.test(m))
         && (r.note === undefined || (typeof r.note === "string" && r.note.length <= 80))
         && (r.type === "virement"
             ? ids.has(r.depuisId) && ids.has(r.versId)
             : ["revenu", "depense"].includes(r.sens) && ids.has(r.compteId)
               && /^[a-z0-9-]+$/.test(r.categorie)));
}
