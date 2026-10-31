import { CONFIG } from "./config";

export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const MODES_PAIEMENT = ["Espèces", "Virement", "Carte", "Chèque"];
const JOUR_MS = 86_400_000;

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

export function debutDuJour(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const estAujourdhui = (ms: number, now = Date.now()) => {
  const debut = debutDuJour(now);
  return ms >= debut && ms < debut + JOUR_MS;
};

/** "14:30" -> {h:14, m:30} (accepte aussi "14h30") */
export function lireHeure(heure: string): { h: number; m: number } {
  const [h, m] = heure.trim().split(/[:hH]/);
  const hh = Math.min(23, Math.max(0, parseInt(h, 10) || 0));
  const mm = Math.min(59, Math.max(0, parseInt(m, 10) || 0));
  return { h: hh, m: mm };
}

export function combinerDateHeure(dateMs: number, heure: string): number {
  const { h, m } = lireHeure(heure);
  const d = new Date(dateMs);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/** Valeur pour <input type="date"> (yyyy-mm-dd) en heure locale */
export function versInputDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function depuisInputDate(v: string): number {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getTime();
}

const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDateLongue = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtJourCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export const formatDate = (ms: number) => fmtDate.format(ms);
export const formatDateLongue = (ms: number) => majuscule(fmtDateLongue.format(ms));
export const formatJourCourt = (ms: number) => majuscule(fmtJourCourt.format(ms));
export const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatMontant(n: number): string {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(n);
}

export function formatDuree(h: number): string {
  return Number.isInteger(h) ? String(h) : h.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

/** Accepte "12,5" comme "12.5" */
export function lireNombre(v: string, defaut: number): number {
  const n = parseFloat(v.replace(",", ".").trim());
  return Number.isFinite(n) ? n : defaut;
}

export const initiales = (prenom: string, nom: string) => `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();

export function remplirModele(
  modele: string,
  v: { prenom?: string; nom?: string; classe?: string; heure?: string; montant?: string; devise?: string }
): string {
  return modele
    .replaceAll("{prenom}", v.prenom ?? "")
    .replaceAll("{nom}", v.nom ?? "")
    .replaceAll("{classe}", v.classe ?? "")
    .replaceAll("{heure}", v.heure ?? "")
    .replaceAll("{montant}", v.montant ?? "")
    .replaceAll("{devise}", v.devise ?? "");
}

export function numeroInternational(tel: string): string {
  let n = tel.replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.length === 8) n = CONFIG.indicatifPays + n;
  return n;
}

export const lienWhatsapp = (tel: string, message: string) =>
  `https://wa.me/${numeroInternational(tel)}?text=${encodeURIComponent(message)}`;
export const lienSms = (tel: string, message: string) => `sms:${tel.replace(/\s/g, "")}?body=${encodeURIComponent(message)}`;
export const lienTel = (tel: string) => `tel:${tel.replace(/\s/g, "")}`;

/** Prochaine occurrence d'un créneau hebdomadaire (0 à 7 jours) */
export function prochainCreneau(jourSemaine: string, heureDebut: string, depuis = Date.now()): number {
  const idx = JOURS.findIndex((j) => j.toLowerCase() === jourSemaine.toLowerCase().trim());
  const cible = idx < 0 ? 6 : (idx + 1) % 7; // en JS : 0 = dimanche ; samedi par défaut
  const d = new Date(combinerDateHeure(depuis, heureDebut));
  while (d.getDay() !== cible) d.setDate(d.getDate() + 1);
  if (d.getTime() <= depuis) d.setDate(d.getDate() + 7);
  return d.getTime();
}

export function dureeEntre(debut: string, fin: string): number | null {
  const a = lireHeure(debut), b = lireHeure(fin);
  const diff = b.h * 60 + b.m - (a.h * 60 + a.m);
  return diff > 0 ? diff / 60 : null;
}

// ---------- Fichiers ----------
export function telecharger(nomFichier: string, contenu: BlobPart, type: string) {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV lisible par Excel (séparateur ; + BOM UTF-8 pour les accents) */
export function versCsv(lignes: (string | number)[][]): string {
  const c = (v: string | number) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return "﻿" + lignes.map((l) => l.map(c).join(";")).join("\r\n");
}
