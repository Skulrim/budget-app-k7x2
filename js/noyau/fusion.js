// Règles de fusion entre l'état local et les documents du cloud (aucun accès au DOM ni à Firebase).
// Principe : pour chaque enregistrement, la version la plus récente (modifieLe) l'emporte.
// Une suppression est une version comme une autre : elle l'emporte si elle est plus récente.

import { LISTES_SUIVIES, appliquerChangementDistant, cleDe, espaceConnu, etat } from "./etat.js";
import { idsCommun } from "./espaces.js";

export function refDoc(liste, cle) {
  return liste + "~" + cle;
}

// Identifiant du compte « externe » qui représente une personne dans l'espace commun
export function idPseudo(uid) {
  return "x" + String(uid).toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Les enregistrements que les autres référencent partent en premier
const RANG = { comptes: 0, categories: 1, objectifs: 2 };

// Copie « versement » d'un virement mixte : mon compte perso est remplacé par le compte externe
// à mon nom, sans note (elle pourrait en dire trop sur mon compte privé).
function miroir(liste, x, communs, auteur) {
  const d = JSON.parse(JSON.stringify(x));
  const pseudo = idPseudo(auteur.uid);
  if (!communs.has(d.depuisId)) d.depuisId = pseudo;
  else d.versId = pseudo;
  d.note = "";
  d.auteur = auteur.uid;
  return { liste: liste, cle: cleDe(liste, x), data: d, supprime: false, modifieLe: x.modifieLe };
}

// Documents locaux modifiés depuis `depuis` (ms), prêts à être envoyés dans le canal "perso" ou "commun"
export function documentsAEnvoyer(depuis, canal, auteur) {
  const docs = [];
  const communs = idsCommun(etat.comptes);
  let aDesMixtes = false;
  for (const liste of LISTES_SUIVIES) {
    for (const x of etat[liste] || []) {
      if (!Number.isInteger(x.modifieLe)) continue;
      const espace = espaceConnu(liste, cleDe(liste, x)) || "perso";
      if (canal === "perso") {
        if (espace === "commun" || x.modifieLe < depuis) continue;
        docs.push({ liste: liste, cle: cleDe(liste, x), data: JSON.parse(JSON.stringify(x)),
                    supprime: false, modifieLe: x.modifieLe });
      } else {
        if (espace === "perso") continue;
        if (espace === "mixte") aDesMixtes = true;
        if (x.modifieLe < depuis) continue;
        docs.push(espace === "mixte"
          ? miroir(liste, x, communs, auteur)
          : { liste: liste, cle: cleDe(liste, x), data: JSON.parse(JSON.stringify(x)),
              supprime: false, modifieLe: x.modifieLe });
      }
    }
  }
  if (canal === "commun" && aDesMixtes) {
    const id = idPseudo(auteur.uid);
    docs.push({ liste: "comptes", cle: id, supprime: false, modifieLe: 1, data: {
      id: id, nom: auteur.prenom, type: "externe", proprietaire: "commun",
      soldeDepart: 0, verseDepart: 0, creeLe: 1, modifieLe: 1, auteur: auteur.uid } });
  }
  for (const s of etat.suppressions || []) {
    const e = s.espace || "perso";
    const pour = canal === "perso" ? (e === "perso" || e === "mixte") : (e === "commun" || e === "mixte");
    if (pour && s.le >= depuis) {
      docs.push({ liste: s.liste, cle: s.cle, data: null, supprime: true, modifieLe: s.le });
    }
  }
  const rang = d => d.supprime ? 9 : (RANG[d.liste] ?? 3);
  return docs.sort((a, b) => rang(a) - rang(b));
}

// Applique un document venu du cloud. Renvoie true si l'état local a changé.
export function fusionnerDistant(doc) {
  const { liste, cle, supprime, modifieLe } = doc;
  let data = doc.data;
  if (!LISTES_SUIVIES.includes(liste) || typeof cle !== "string" || !Number.isInteger(modifieLe)) return false;
  const local = (etat[liste] || []).find(x => cleDe(liste, x) === cle);
  if (supprime) {
    if (!local) return false;
    if (local.modifieLe > modifieLe) return false; // modifié ici après la suppression : on garde
    return appliquerChangementDistant(liste, cle, null, modifieLe);
  }
  if (!data || typeof data !== "object" || cleDe(liste, data) !== cle) return false;
  const trace = (etat.suppressions || []).find(s => s.liste === liste && s.cle === cle);
  if (trace && trace.le >= modifieLe) return false; // supprimé ici après : on ne ressuscite pas
  // Récurrents : les mois déjà validés (traites) ne se perdent jamais, quel que soit l'appareil
  if (liste === "recurrentes" && local && Array.isArray(data.traites)) {
    const avant = local.traites || [];
    const toutes = [...new Set([...avant, ...data.traites])];
    if (local.modifieLe >= modifieLe) {
      if (toutes.length === avant.length) return false;
      local.traites = toutes; // changement local : sauvegarder() le datera et le renverra
      return true;
    }
    data = { ...data, traites: toutes };
  }
    // Compte « externe » (prénom de l'autre personne) : un changement de nom est toujours accepté
  if (liste === "comptes" && data.type === "externe" && local && local.type === "externe") {
    if (local.nom === data.nom) return false;
    return appliquerChangementDistant(liste, cle, data, local.modifieLe);
  }
  if (local && local.modifieLe >= modifieLe) return false;
  return appliquerChangementDistant(liste, cle, data, modifieLe);
}
