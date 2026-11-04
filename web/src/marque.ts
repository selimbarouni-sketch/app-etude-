import { CONFIG } from "./config";
import { getDonnees, useDonnees } from "./store";
import type { Donnees } from "./types";

/** Couleurs proposées dans Paramètres > Personnalisation. */
export const PALETTE = [
  { nom: "Bleu", valeur: "#1565C0" },
  { nom: "Bleu nuit", valeur: "#1F2A44" },
  { nom: "Vert", valeur: "#2E7D32" },
  { nom: "Émeraude", valeur: "#00897B" },
  { nom: "Violet", valeur: "#6A1B9A" },
  { nom: "Bordeaux", valeur: "#8E1B3B" },
  { nom: "Orange", valeur: "#E65100" },
  { nom: "Rose", valeur: "#C2185B" },
  { nom: "Gris anthracite", valeur: "#37474F" },
];

export interface MarqueEffective { nom: string; slogan: string; logo: string; couleur: string; personnalisee: boolean }

/** Nom, sous-titre, logo et couleur à afficher (personnalisation, sinon valeurs par défaut). */
export function marque(d: Donnees = getDonnees()): MarqueEffective {
  const m = d.reglages.marque ?? {};
  const couleurStyle = d.reglages.style === "chic" ? CONFIG.couleurChic : CONFIG.couleurPrincipale;
  return {
    nom: m.nom?.trim() || CONFIG.nomApp,
    slogan: m.slogan?.trim() || CONFIG.slogan,
    logo: m.logo || "/icon-192.png",
    couleur: m.couleur || couleurStyle,
    personnalisee: !!(m.nom || m.slogan || m.couleur || m.logo),
  };
}

export const useMarque = () => marque(useDonnees());

// ---------- Couleurs ----------
const versRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const versHex = (rgb: number[]) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

/** Mélange avec du blanc (t entre 0 et 1) : version claire pour le mode sombre. */
export const eclaircir = (hex: string, t: number) => versHex(versRgb(hex).map((v) => v + (255 - v) * t));

/** Luminance relative (0 = noir, 1 = blanc). */
export function luminance(hex: string) {
  const [r, g, b] = versRgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Couleur principale et couleur du texte posé dessus, en clair ou en sombre. */
export function couleursTheme(d: Donnees, sombre: boolean): { principale: string; surPrincipale: string } {
  const m = d.reglages.marque;
  let principale: string;
  if (m?.couleur) principale = sombre ? eclaircir(m.couleur, luminance(m.couleur) < 0.08 ? 0.55 : 0.4) : m.couleur;
  else principale = d.reglages.style === "chic"
    ? (sombre ? CONFIG.couleurChicSombre : CONFIG.couleurChic)
    : (sombre ? CONFIG.couleurPrincipaleSombre : CONFIG.couleurPrincipale);
  return { principale, surPrincipale: luminance(principale) > 0.45 ? "#111111" : "#ffffff" };
}

/** Redimensionne une image choisie (logo) en carré PNG de 256 px, renvoyée en data URL. */
export function preparerLogo(fichier: File): Promise<string> {
  return new Promise((ok, ko) => {
    if (fichier.size > 8 * 1024 * 1024) return ko(new Error("Image trop lourde (8 Mo maximum)."));
    const img = new Image();
    const url = URL.createObjectURL(fichier);
    img.onload = () => {
      const taille = 256;
      const c = document.createElement("canvas");
      c.width = taille; c.height = taille;
      const ctx = c.getContext("2d")!;
      // Le logo est centré sans être déformé (fond transparent autour)
      const echelle = Math.min(taille / img.width, taille / img.height);
      const w = img.width * echelle, h = img.height * echelle;
      ctx.drawImage(img, (taille - w) / 2, (taille - h) / 2, w, h);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error("Image illisible.")); };
    img.src = url;
  });
}
