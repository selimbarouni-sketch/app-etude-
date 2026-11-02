import type { Eleve } from "./types";
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
