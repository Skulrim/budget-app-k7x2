// Point d'entrée : branche les écouteurs de chaque module, puis démarre l'appli.

import { charger } from "./noyau/etat.js";
import { brancherRendu } from "./rendu.js";
import { afficherAjustements, initAjustements } from "./ui/ajustements.js";
import { afficherBadges, afficherSeries, verifierBadges } from "./ui/badges.js";
import { afficherCarteBilan, initBilan } from "./ui/bilan.js";
import { afficherBudgets, initBudgets } from "./ui/budgets.js";
import { afficherCategories, initCategories } from "./ui/categories.js";
import { afficherComptes, afficherGestionComptes, afficherPatrimoine, initComptes, majChampVerse } from "./ui/comptes.js";
import { afficherMatelas, afficherMises, afficherObjectifs, afficherPlans, initEpargne } from "./ui/epargne.js";
import { afficherAnneaux, afficherCourbeEpargne, afficherHistogrammeMois, initGraphiques } from "./ui/graphiques.js";
import { afficherPrevision } from "./ui/prevision.js";
import { afficherMouvements, initMouvements, remplirFiltresMouvements } from "./ui/mouvements.js";
import { afficherVue, initNavigation } from "./ui/navigation.js";
import { initNotifications } from "./ui/notifications.js";
import { afficherOperations, initOperations } from "./ui/operations.js";
import { afficherValorisations, initPlacements } from "./ui/placements.js";
import { afficherRappels, initRappels } from "./ui/rappels.js";
import { afficherAValider, afficherRecurrentes, initRecurrences } from "./ui/recurrences.js";
import { initSaisie } from "./ui/saisie.js";
import { exporterSauvegarde, initSauvegarde } from "./ui/sauvegarde.js";
import { initSelecteurs, remplirChoixBudget, remplirChoixCategories, remplirChoixCategoriesRec, remplirChoixComptes } from "./ui/selecteurs.js";
import { appliquerTheme, initTheme, themeEnregistre } from "./ui/theme.js";

// Les écrans à redessiner à chaque changement, dans l'ordre d'origine
function rafraichir() {
  afficherComptes();
  afficherOperations();
  afficherBudgets();
  afficherPrevision();
  afficherValorisations();
  afficherPatrimoine();
  afficherGestionComptes();
  afficherAjustements();
  afficherMatelas();
  afficherObjectifs();
  afficherMises();
  verifierBadges();
  afficherSeries();
  afficherBadges();
  afficherCarteBilan();
  afficherCategories();
  afficherPlans();
  afficherRappels();
  remplirFiltresMouvements();
  afficherMouvements();
  afficherAValider();
  afficherRecurrentes();
  remplirChoixCategoriesRec();
  afficherAnneaux();
  afficherCourbeEpargne();
  afficherHistogrammeMois();
}

function rafraichirTout() {
  remplirChoixCategories();
  remplirChoixBudget();
  rafraichir();
}

// Les autres modules appellent rafraichir() via rendu.js, sans connaître les écrans
brancherRendu({ rafraichir, rafraichirTout });

initNavigation();
initAjustements();
initTheme();
initSelecteurs();
initComptes();
initBudgets();
initCategories();
initEpargne();
initPlacements();
initSaisie();
initOperations();
initNotifications();
initBilan();
initRappels(exporterSauvegarde);
initSauvegarde();
initMouvements();
initRecurrences();
initGraphiques();

// Démarrage (même ordre qu'avant le découpage)
appliquerTheme(themeEnregistre());
charger();
remplirChoixComptes();
remplirChoixCategories();
majChampVerse();
remplirChoixBudget();
rafraichir();
afficherVue("accueil");
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(new URL("../sw.js", import.meta.url));
}
