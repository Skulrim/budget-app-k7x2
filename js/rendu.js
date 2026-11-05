// Façade du rafraîchissement : évite que chaque module importe tous les écrans.

let moteur = { rafraichir() {}, rafraichirTout() {} };

export function brancherRendu(implementation) {
  moteur = implementation;
}

export function rafraichir() {
  moteur.rafraichir();
}

export function rafraichirTout() {
  moteur.rafraichirTout();
}
