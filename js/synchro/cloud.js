// Synchronisation avec Firestore (aucun accès au DOM). Deux canaux :
//   "perso"  : users/{uid}/records       (privé)
//   "commun" : foyers/maison/records     (partagé entre les deux comptes autorisés par les règles Firestore)
// Un enregistrement = un document « liste~clé ». Envoi par lots, réception en direct,
// fusion « le plus récent gagne » (voir noyau/fusion.js).
// Le SDK est chargé à la demande : hors connexion, l'appli reste entièrement utilisable.

import { appliquerAdoption, nombreCommunLocal, planAdoption } from "../noyau/adoption.js";
import { espaceConnu, referencesParEspace, sauvegarder, surSauvegarde } from "../noyau/etat.js";
import { documentsAEnvoyer, fusionnerDistant, refDoc } from "../noyau/fusion.js";
import { BASE_SDK, obtenirApplication } from "./auth.js";

const CLE_META = "budget-sync-v1";
const MARGE_LECTURE = 5 * 60 * 1000;
const TAILLE_LOT = 400;

const TEXTE_REFERENCE = "Espace commun : aucune donnée partagée n'existe encore.\n\n"
  + "Les données du compte commun de ce téléphone (comptes, opérations, budgets, catégories et récurrents du commun) "
  + "vont devenir la référence que l'autre personne rejoindra.\n\nContinuer ?";
const TEXTE_ADOPTION = "Espace commun : des données partagées existent déjà.\n\n"
  + "Les données du compte commun de CE téléphone (comptes, opérations, budgets, catégories et récurrents du commun) "
  + "vont être REMPLACÉES par celles de l'espace partagé. Tes comptes perso ne sont pas touchés.\n\nContinuer ?";

let fs = null;
let bd = null;
let uidActif = null;
let prenomActif = "";
let inscrit = false;
let canaux = {};
let rappels = { statut() {}, miseAJour() {}, confirmer: () => false, alerte() {} };

function lireMeta() {
  let m = {};
  try { m = JSON.parse(localStorage.getItem(CLE_META)) || {}; } catch (e) {}
  if (m.dernierPush !== undefined && !m.perso) { // ancien format (7c)
    m.perso = { dernierPush: m.dernierPush, dernierPull: m.dernierPull || 0 };
    delete m.dernierPush;
    delete m.dernierPull;
  }
  m.perso = m.perso || { dernierPush: 0, dernierPull: 0 };
  m.commun = m.commun || { dernierPush: 0, dernierPull: 0 };
  return m;
}

function ecrireMeta(m) {
  try { localStorage.setItem(CLE_META, JSON.stringify(m)); } catch (e) {}
}

function majMeta(canal, champs) {
  const m = lireMeta();
  Object.assign(m[canal], champs);
  ecrireMeta(m);
}

function prenomDepuisEmail(email) {
  const debut = String(email || "").split("@")[0].split(/[._\-+0-9]/)[0];
  return debut ? debut.charAt(0).toUpperCase() + debut.slice(1) : "Membre";
}

function codeStatut(e) {
  if (e && e.code === "permission-denied") return "refus";
  if (!navigator.onLine || (e && (e.code === "unavailable" || e.message === "delai"))) return "hors-ligne";
  return "erreur";
}

function avecDelai(promesse, ms) {
  return Promise.race([promesse, new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("delai")), ms))]);
}

function chemin(nom) {
  return nom === "perso" ? ["users", uidActif, "records"] : ["foyers", "maison", "records"];
}

function resume() {
  const codes = Object.values(canaux).map(c => c.statut);
  for (const code of ["refus", "erreur", "hors-ligne", "commun-refuse"]) {
    if (codes.includes(code)) return code;
  }
  if (!canaux.commun || codes.includes("synchro")) return "synchro";
  return "ok";
}

function statutCanal(nom, code) {
  if (canaux[nom]) canaux[nom].statut = code;
  rappels.statut(resume());
}

function nouveauCanal() {
  return { arreter: null, dejaPousse: new Map(), premier: false, minuterie: null,
           enCours: false, aRepousser: false, statut: "synchro" };
}

function arreterCanal(nom) {
  const c = canaux[nom];
  if (!c) return;
  if (c.arreter) c.arreter();
  c.arreter = null;
  clearTimeout(c.minuterie);
}

export function arreterCloud() {
  for (const nom of Object.keys(canaux)) arreterCanal(nom);
  canaux = {};
  uidActif = null;
}

// utilisateur : { uid, email }
// mesRappels : statut(code), miseAJour(), confirmer(texte) -> booléen, alerte(texte)
export async function demarrerCloud(utilisateur, mesRappels) {
  arreterCloud();
  rappels = mesRappels;
  const meta = lireMeta();
  if (meta.uid && meta.uid !== utilisateur.uid) {
    rappels.statut("autre-compte"); // les données de cet appareil appartiennent à un autre compte
    return;
  }
  if (!meta.uid) {
    meta.uid = utilisateur.uid;
    ecrireMeta(meta);
  }
  uidActif = utilisateur.uid;
  prenomActif = prenomDepuisEmail(utilisateur.email);
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
    surSauvegarde(() => {
      planifierPush("perso", 2000);
      planifierPush("commun", 2000);
    });
  }
  demarrerCanal("perso");
}

function demarrerCanal(nom) {
  canaux[nom] = nouveauCanal();
  const depuis = Math.max(0, (lireMeta()[nom].dernierPull || 0) - MARGE_LECTURE);
  const requete = fs.query(fs.collection(bd, ...chemin(nom)),
    fs.where("maj", ">", fs.Timestamp.fromMillis(depuis)));
  canaux[nom].arreter = fs.onSnapshot(requete,
    (snap) => traiterSnapshot(nom, snap),
    (e) => statutCanal(nom, codeStatut(e)));
}

// Premier contact avec l'espace commun sur cet appareil : référence (premier) ou adoption (suivant).
// Renvoie "ok", "adopte" ou "stop".
function initialiserCommun(docs) {
  if (lireMeta().commun.statut) return "ok";
  const partages = docs.filter(d => !d.supprime);
  const local = nombreCommunLocal();
  if (partages.length === 0) {
    if (local === 0 || rappels.confirmer(TEXTE_REFERENCE)) {
      majMeta("commun", { statut: "reference" });
      return "ok";
    }
    return "stop";
  }
  if (local === 0) {
    majMeta("commun", { statut: "adopte" });
    return "ok";
  }
  if (!rappels.confirmer(TEXTE_ADOPTION)) return "stop";
  const plan = planAdoption(docs);
  if (!plan.ok) {
    rappels.alerte(plan.message);
    return "stop";
  }
  appliquerAdoption(plan);
  majMeta("commun", { statut: "adopte" });
  return "adopte";
}

// Documents à ne pas appliquer dans le canal commun : mes propres copies « versement »,
// et les suppressions qui viseraient mes virements perso (mixtes).
function ignorer(nom, doc) {
  if (nom !== "commun") return false;
  if (doc.data && doc.data.auteur === uidActif) return true;
  if (doc.supprime && ["mixte", "perso"].includes(espaceConnu(doc.liste, doc.cle))) return true;
  return false;
}

function traiterSnapshot(nom, snap) {
  const canal = canaux[nom];
  if (!canal) return;
  const docs = [];
  let max = lireMeta()[nom].dernierPull || 0;
  snap.docChanges().forEach((ch) => {
    if (ch.type === "removed" || ch.doc.metadata.hasPendingWrites) return;
    const d = ch.doc.data();
    if (d.maj && d.maj.toMillis) max = Math.max(max, d.maj.toMillis());
    docs.push({ liste: d.liste, cle: d.cle, data: d.data || null,
                supprime: d.supprime === true, modifieLe: d.modifieLe });
  });
  let change = false;
  if (nom === "commun" && !canal.premier) {
    const decision = initialiserCommun(docs);
    if (decision === "stop") {
      arreterCanal("commun");
      statutCanal("commun", "commun-refuse");
      return;
    }
    if (decision === "adopte") change = true;
  }
  for (const doc of docs) {
    if (Number.isInteger(doc.modifieLe)) canal.dejaPousse.set(refDoc(doc.liste, doc.cle), doc.modifieLe);
    if (ignorer(nom, doc)) continue;
    if (fusionnerDistant(doc)) change = true;
  }
  majMeta(nom, { dernierPull: max });
  if (change) {
    sauvegarder();
    rappels.miseAJour();
  }
  canal.premier = true;
  statutCanal(nom, "ok");
  if (nom === "perso" && !canaux.commun) demarrerCanal("commun"); // le commun démarre une fois le perso reçu
  planifierPush(nom, 300);
}

function planifierPush(nom, delai) {
  const c = canaux[nom];
  if (!uidActif || !c || !c.premier) return; // rien n'est envoyé avant d'avoir reçu l'état du cloud
  clearTimeout(c.minuterie);
  c.minuterie = setTimeout(() => pousser(nom), delai);
}

async function pousser(nom) {
  const c = canaux[nom];
  if (!uidActif || !c) return;
  if (c.enCours) { c.aRepousser = true; return; }
  if (!navigator.onLine) { statutCanal(nom, "hors-ligne"); return; }
  const statutCommun = lireMeta().commun.statut;
  if (nom === "commun" && statutCommun !== "reference" && statutCommun !== "adopte") return;
  c.enCours = true;
  const t0 = Date.now();
  const docs = documentsAEnvoyer(lireMeta()[nom].dernierPush || 0, nom, { uid: uidActif, prenom: prenomActif })
    .filter(d => !(c.dejaPousse.get(refDoc(d.liste, d.cle)) >= d.modifieLe));
  try {
    for (let i = 0; i < docs.length; i += TAILLE_LOT) {
      const lot = fs.writeBatch(bd);
      for (const d of docs.slice(i, i + TAILLE_LOT)) {
        lot.set(fs.doc(bd, ...chemin(nom), refDoc(d.liste, d.cle)), {
          liste: d.liste, cle: d.cle, data: d.data, supprime: d.supprime,
          modifieLe: d.modifieLe, maj: fs.serverTimestamp()
        });
      }
      await avecDelai(lot.commit(), 20000);
    }
    for (const d of docs) c.dejaPousse.set(refDoc(d.liste, d.cle), d.modifieLe);
    majMeta(nom, { dernierPush: t0 });
    statutCanal(nom, "ok");
    if (nom === "commun") await purgerCommunDuPrive();
  } catch (e) {
    statutCanal(nom, codeStatut(e));
  } finally {
    c.enCours = false;
    if (c.aRepousser) {
      c.aRepousser = false;
      planifierPush(nom, 1000);
    }
  }
}

// Une seule fois, sur l'appareil « référence » : retire de l'espace privé les copies du commun
// envoyées avant le partage (elles y sont désormais inutiles).
async function purgerCommunDuPrive() {
  const meta = lireMeta();
  if (meta.commun.statut !== "reference" || meta.purgeFait) return;
  if (!canaux.perso || !canaux.perso.premier) return;
  const refs = referencesParEspace("commun");
  try {
    for (let i = 0; i < refs.length; i += TAILLE_LOT) {
      const lot = fs.writeBatch(bd);
      for (const r of refs.slice(i, i + TAILLE_LOT)) {
        lot.delete(fs.doc(bd, "users", uidActif, "records", refDoc(r.liste, r.cle)));
      }
      await avecDelai(lot.commit(), 20000);
    }
    const m = lireMeta();
    m.purgeFait = true;
    ecrireMeta(m);
  } catch (e) { /* sans gravité : sera retenté au prochain démarrage */ }
}

// À appeler quand la connexion revient ou quand l'appli repasse au premier plan
export function relancer() {
  planifierPush("perso", 500);
  planifierPush("commun", 500);
}
