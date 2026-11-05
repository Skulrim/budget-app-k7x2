// Thèmes de couleurs et mode automatique.

const CLE_THEME = "budget-theme";

const NOMS_THEMES = ["bleu-rose", "sombre", "pastel", "ludique",
                     "dore", "argente", "foret", "ocean", "minuit", "orargent", "auto"];

export function themeEnregistre() {
  try { return localStorage.getItem(CLE_THEME) || "bleu-rose"; }
  catch (e) { return "bleu-rose"; }
}

function themeEffectif(choix) {
  if (choix === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "sombre" : "bleu-rose";
  }
  return choix;
}

export function appliquerTheme(nom) {
  if (!NOMS_THEMES.includes(nom)) nom = "bleu-rose";
  try { localStorage.setItem(CLE_THEME, nom); } catch (e) {}
  document.documentElement.setAttribute("data-theme", themeEffectif(nom));
  const fond = getComputedStyle(document.documentElement).getPropertyValue("--fond").trim();
  document.querySelector('meta[name="theme-color"]').setAttribute("content", fond);
  document.getElementById("choix-theme").value = nom;
}

// Branche les écouteurs d'événements de ce module (appelé une fois par main.js)
export function initTheme() {
  document.getElementById("choix-theme").addEventListener("change", (e) => appliquerTheme(e.target.value));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (themeEnregistre() === "auto") appliquerTheme("auto");
  });
}
