// Connexion Firebase (aucun accès au DOM).
// Le SDK est chargé à la demande : hors connexion ou sans configuration,
// l'appli continue de fonctionner normalement en local.

import { firebaseConfig } from "./config.js";

const VERSION_SDK = "10.14.1";
export const BASE_SDK = "https://www.gstatic.com/firebasejs/" + VERSION_SDK + "/";

let sdk = null;
let utilisateurCourant = null;
let surChangement = null;
let abonne = false;

export function estConfigure() {
  return Boolean(firebaseConfig.apiKey) && firebaseConfig.apiKey !== "A_REMPLIR";
}

async function chargerSdk() {
  if (sdk) return sdk;
  const [app, auth] = await Promise.all([
    import(BASE_SDK + "firebase-app.js"),
    import(BASE_SDK + "firebase-auth.js")
  ]);
  const application = app.initializeApp(firebaseConfig);
  sdk = { application: application, auth: auth.getAuth(application),
          onAuthStateChanged: auth.onAuthStateChanged,
          signInWithEmailAndPassword: auth.signInWithEmailAndPassword, signOut: auth.signOut };
  return sdk;
}

// L'application Firebase, pour les autres services (base de données)
export async function obtenirApplication() {
  return (await chargerSdk()).application;
}

async function assurerAbonnement() {
  const s = await chargerSdk();
  if (!abonne && surChangement) {
    abonne = true;
    s.onAuthStateChanged(s.auth, (u) => {
      utilisateurCourant = u;
      surChangement(u);
    });
  }
  return s;
}

// Au démarrage : retrouve la session existante et prévient l'écran à chaque changement
export async function demarrerAuth(rappel) {
  surChangement = rappel;
  await assurerAbonnement();
}

export async function connecter(email, motDePasse) {
  const s = await assurerAbonnement();
  await s.signInWithEmailAndPassword(s.auth, email, motDePasse);
}

export async function deconnecter() {
  const s = await assurerAbonnement();
  await s.signOut(s.auth);
}

export function utilisateur() {
  return utilisateurCourant;
}
