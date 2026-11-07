// Synchronisation de l'espace privé de l'utilisateur avec Firestore (aucun accès au DOM).
// Un enregistrement = un document « users/{uid}/records/{liste~clé} ».
// Envoi : les enregistrements modifiés depuis le dernier envoi, par lots.
// Réception : écoute en direct des documents modifiés (date du serveur), fusion « le plus récent gagne ».
// Le SDK est chargé à la demande : hors connexion, l'appli reste entièrement utilisable.

import { sauvegarder, surSauvegarde } from "../noyau/etat.js";
import { documentsAEnvoyer, fusionnerDistant, refDoc } from "../noyau/fusion.js";
import { BASE_SDK, obtenirApplication } from "./auth.js";

const CLE_META = "budget-sync-v1";
const MARGE_LECTURE = 5 * 60 * 1000;
const TAILLE_LOT = 400;

let fs = null;
let bd = null;
let uidActif = null;
let arreter = null;
let minuterie = null;
let enCours = false;
let aRepousser = false;
let premierSnapshot = false;
let inscrit = false;
let rappels = { statut() {}, miseAJour() {} };
const dejaPousse = new Map(); // "liste~clé" -> modifieLe connu dans le cloud

function lireMeta() {
  try { return JSON.parse(localStorage.getItem(CLE_META)) || {}; }
  catch (e) { return {}; }
}

function ecrireMeta(meta) {
  try { localStorage.setItem(CLE_META, JSON.stringify(meta)); } catch (e) {}
}

function codeStatut(e) {
  if (e && e.code === "permission-denied") return "refus";
  if (!navigator.onLine || (e && (e.code === "unavailable" || e.message === "delai"))) return "hors-ligne";
  return "erreur";
}

function avecDelai(promesse, ms) {
  return Promise.race([promesse, new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("delai")), ms))]);
}

export function arreterCloud() {
  if (arreter) arreter();
  arreter = null;
  clearTimeout(minuterie);
  uidActif = null;
  premierSnapshot = false;
  dejaPousse.clear();
}

// rappels.statut(code) : "synchro", "ok", "hors-ligne", "refus", "erreur", "autre-compte"
// rappels.miseAJour() : appelé quand des données venues du cloud ont été appliquées
export async function demarrerCloud(uid, mesRappels) {
  arreterCloud();
  rappels = mesRappels;
  const meta = lireMeta();
  if (meta.uid && meta.uid !== uid) {
    rappels.statut("autre-compte"); // les données de cet appareil appartiennent à un autre compte
    return;
  }
  if (!meta.uid) ecrireMeta({ uid: uid, dernierPush: 0, dernierPull: 0 });
  rappels.statut("synchro");
  try {
    if (!fs) fs = await import(BASE_SDK + "firebase-firestore.js");
    bd = fs.getFirestore(await obtenirApplication());
  } catch (e) {
    rappels.statut("hors-ligne");
    return;
  }
  if (!inscrit) {
    inscrit = true;
    surSauvegarde(() => planifierPush(2000));
  }
  uidActif = uid;
  ecouter(uid);
}

function ecouter(uid) {
  const depuis = Math.max(0, (lireMeta().dernierPull || 0) - MARGE_LECTURE);
  const requete = fs.query(fs.collection(bd, "users", uid, "records"),
    fs.where("maj", ">", fs.Timestamp.fromMillis(depuis)));
  arreter = fs.onSnapshot(requete, (snap) => {
    let change = false;
    let max = lireMeta().dernierPull || 0;
    snap.docChanges().forEach((ch) => {
      if (ch.type === "removed" || ch.doc.metadata.hasPendingWrites) return;
      const d = ch.doc.data();
      if (d.maj && d.maj.toMillis) max = Math.max(max, d.maj.toMillis());
      const doc = { liste: d.liste, cle: d.cle, data: d.data || null,
                    supprime: d.supprime === true, modifieLe: d.modifieLe };
      if (Number.isInteger(doc.modifieLe)) dejaPousse.set(refDoc(doc.liste, doc.cle), doc.modifieLe);
      if (fusionnerDistant(doc)) change = true;
    });
    ecrireMeta({ ...lireMeta(), dernierPull: max });
    if (change) {
      sauvegarder();
      rappels.miseAJour();
    }
    premierSnapshot = true;
    rappels.statut("ok");
    planifierPush(300);
  }, (e) => rappels.statut(codeStatut(e)));
}

function planifierPush(delai) {
  if (!uidActif || !premierSnapshot) return; // on n'envoie rien avant d'avoir reçu l'état du cloud
  clearTimeout(minuterie);
  minuterie = setTimeout(pousser, delai);
}

async function pousser() {
  if (!uidActif) return;
  if (enCours) { aRepousser = true; return; }
  if (!navigator.onLine) { rappels.statut("hors-ligne"); return; }
  enCours = true;
  const t0 = Date.now();
  const docs = documentsAEnvoyer(lireMeta().dernierPush || 0)
    .filter(d => !(dejaPousse.get(refDoc(d.liste, d.cle)) >= d.modifieLe));
  try {
    for (let i = 0; i < docs.length; i += TAILLE_LOT) {
      const lot = fs.writeBatch(bd);
      for (const d of docs.slice(i, i + TAILLE_LOT)) {
        lot.set(fs.doc(bd, "users", uidActif, "records", refDoc(d.liste, d.cle)), {
          liste: d.liste, cle: d.cle, data: d.data, supprime: d.supprime,
          modifieLe: d.modifieLe, maj: fs.serverTimestamp()
        });
      }
      await avecDelai(lot.commit(), 20000);
    }
    for (const d of docs) dejaPousse.set(refDoc(d.liste, d.cle), d.modifieLe);
    ecrireMeta({ ...lireMeta(), dernierPush: t0 });
    rappels.statut("ok");
  } catch (e) {
    rappels.statut(codeStatut(e));
  } finally {
    enCours = false;
    if (aRepousser) {
      aRepousser = false;
      planifierPush(1000);
    }
  }
}

// À appeler quand la connexion revient ou quand l'appli repasse au premier plan
export function relancer() {
  planifierPush(500);
}
