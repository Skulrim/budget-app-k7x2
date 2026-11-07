// Réglages : connexion au compte de synchronisation et état de la synchronisation.

import { echapper } from "../noyau/outils.js";
import { rafraichirTout } from "../rendu.js";
import { connecter, deconnecter, demarrerAuth, estConfigure, utilisateur } from "../synchro/auth.js";
import { arreterCloud, demarrerCloud, relancer } from "../synchro/cloud.js";
import { remplirChoixComptes } from "./selecteurs.js";

let texteCloud = "";

const TEXTES_CLOUD = {
  "synchro": "Synchronisation en cours…",
  "hors-ligne": "Hors connexion : tes changements seront envoyés plus tard.",
  "refus": "Accès refusé : vérifie que les règles de sécurité Firestore sont publiées.",
  "erreur": "Erreur de synchronisation : vérifie que la base Firestore est créée, puis réessaie.",
  "autre-compte": "Cet appareil contient les données d'un autre compte : synchronisation désactivée."
};

function messageErreur(e) {
  const code = e && e.code ? e.code : "";
  if (code === "auth/network-request-failed" || e instanceof TypeError || !navigator.onLine) {
    return "Pas de connexion internet";
  }
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(code)) {
    return "E-mail ou mot de passe incorrect";
  }
  if (code === "auth/too-many-requests") return "Trop d'essais : réessaie dans quelques minutes";
  return "Connexion impossible";
}

export function afficherConnexion() {
  const statut = document.getElementById("statut-synchro");
  const formulaire = document.getElementById("formulaire-connexion");
  const bloc = document.getElementById("bloc-deconnexion");
  const u = utilisateur();
  formulaire.hidden = true;
  bloc.hidden = true;
  if (!estConfigure()) {
    statut.textContent = "Synchronisation non configurée (valeurs Firebase manquantes dans js/synchro/config.js).";
  } else if (u) {
    statut.innerHTML = "Connecté : <b>" + echapper(u.email) + "</b>"
      + (texteCloud ? "<br>" + echapper(texteCloud) : "");
    bloc.hidden = false;
  } else {
    statut.textContent = "Non connecté : l'appli fonctionne en local sur cet appareil.";
    formulaire.hidden = false;
  }
}

function surStatutCloud(code) {
  if (code === "ok") {
    texteCloud = "Synchronisé à " + new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } else {
    texteCloud = TEXTES_CLOUD[code] || "";
  }
  afficherConnexion();
}

// Des données venues du cloud ont été appliquées : on redessine tout
function surMiseAJour() {
  remplirChoixComptes();
  rafraichirTout();
}

function surChangementAuth(u) {
  if (u) {
    demarrerCloud(u.uid, { statut: surStatutCloud, miseAJour: surMiseAJour })
      .catch(() => surStatutCloud("erreur"));
  } else {
    arreterCloud();
    texteCloud = "";
  }
  afficherConnexion();
}

async function seConnecter() {
  const email = document.getElementById("connexion-email").value.trim();
  const mdp = document.getElementById("connexion-mdp").value;
  const message = document.getElementById("message-connexion");
  if (email === "" || mdp === "") {
    message.textContent = "Saisis ton e-mail et ton mot de passe";
    return;
  }
  message.textContent = "Connexion…";
  try {
    await connecter(email, mdp);
    message.textContent = "";
    document.getElementById("connexion-mdp").value = "";
  } catch (e) {
    message.textContent = messageErreur(e);
  }
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initConnexion() {
  document.getElementById("bouton-connexion").addEventListener("click", seConnecter);
  document.getElementById("connexion-mdp").addEventListener("keydown", (e) => {
    if (e.key === "Enter") seConnecter();
  });
  document.getElementById("bouton-deconnexion").addEventListener("click", () => {
    deconnecter().catch(() => {});
  });
  window.addEventListener("online", relancer);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) relancer();
  });
  if (!estConfigure()) {
    afficherConnexion();
    return;
  }
  document.getElementById("statut-synchro").textContent = "Vérification de la connexion…";
  demarrerAuth(surChangementAuth).catch(() => {
    document.getElementById("statut-synchro").textContent = "Hors connexion : l'appli fonctionne en local.";
  });
}
