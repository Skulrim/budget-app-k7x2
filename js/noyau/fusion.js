// Règles de fusion entre l'état local et les documents du cloud (aucun accès au DOM ni à Firebase).
// Principe : pour chaque enregistrement, la version la plus récente (modifieLe) l'emporte.
// Une suppression est une version comme une autre : elle l'emporte si elle est plus récente.

import { LISTES_SUIVIES, appliquerChangementDistant, cleDe, etat } from "./etat.js";

export function refDoc(liste, cle) {
  return liste + "~" + cle;
}

// Les enregistrements que les autres référencent partent en premier
const RANG = { comptes: 0, categories: 1, objectifs: 2 };

// Documents locaux modifiés depuis `depuis` (ms), prêts à être envoyés
export function documentsAEnvoyer(depuis) {
  const docs = [];
  for (const liste of LISTES_SUIVIES) {
    for (const x of etat[liste] || []) {
      if (Number.isInteger(x.modifieLe) && x.modifieLe >= depuis) {
        docs.push({ liste: liste, cle: cleDe(liste, x), data: JSON.parse(JSON.stringify(x)),
                    supprime: false, modifieLe: x.modifieLe });
      }
    }
  }
  for (const s of etat.suppressions || []) {
    if (s.le >= depuis) {
      docs.push({ liste: s.liste, cle: s.cle, data: null, supprime: true, modifieLe: s.le });
    }
  }
  const rang = d => d.supprime ? 9 : (RANG[d.liste] ?? 3);
  return docs.sort((a, b) => rang(a) - rang(b));
}

// Applique un document venu du cloud. Renvoie true si l'état local a changé.
export function fusionnerDistant(doc) {
  const { liste, cle, data, supprime, modifieLe } = doc;
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
  if (local && local.modifieLe >= modifieLe) return false;
  return appliquerChangementDistant(liste, cle, data, modifieLe);
}
