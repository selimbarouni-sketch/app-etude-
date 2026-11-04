import type { Eleve } from "./types";
import { alertesAbsences, getDonnees } from "./store";
import { toast } from "./components";

/** Prévient le professeur qu'un ou plusieurs élèves ont atteint le nombre de séances à payer. */
export function notifierPaiementsAttendus(eleves: Eleve[], limite: number) {
  if (!eleves.length) return;
  const noms = eleves.map((e) => `${e.prenom} ${e.nom}`).join(", ");
  const texte = `${noms} ${eleves.length > 1 ? "ont" : "a"} atteint ${limite} séances : paiement à encaisser.`;
  toast(`💰 ${texte}`);
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Paiement attendu", { body: texte, icon: "/icon-192.png" });
    }
  } catch {
    /* notifications indisponibles */
  }
}

/** Après l'appel : prévient si des élèves cumulent des absences consécutives. */
export function notifierAbsences() {
  const alertes = alertesAbsences(getDonnees());
  if (!alertes.length) return;
  const texte = alertes.map((a) => `${a.eleve.prenom} ${a.eleve.nom} (${a.nb} absences de suite)`).join(", ");
  setTimeout(() => toast(`⚠️ Absences : ${texte}`), 3000);
  try {
    if ("Notification" in window && Notification.permission === "granted") new Notification("Absences répétées", { body: texte, icon: "/icon-192.png" });
  } catch { /* ignore */ }
}
