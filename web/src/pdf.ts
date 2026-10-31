import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CONFIG } from "./config";
import type { Donnees, Eleve } from "./types";
import { formatDate, formatDuree, formatMontant } from "./utils";

const STATUT: Record<string, string> = { P: "Présent", A: "Absent", R: "Retard" };

/** Rapport PDF d'un élève (toutes les séances et tous les paiements, sur plusieurs pages si besoin). */
export function rapportEleve(d: Donnees, e: Eleve) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const bleu = CONFIG.couleurPrincipale;
  const seances = d.seances.filter((s) => s.eleveId === e.id).sort((a, b) => b.date - a.date);
  const paiements = d.paiements.filter((p) => p.eleveId === e.id).sort((a, b) => b.date - a.date);
  const devise = d.reglages.devise;
  // Les polices par défaut de jsPDF ne gèrent pas les espaces fines insécables
  const m = (n: number) => formatMontant(n).replace(/[  ]/g, " ");

  doc.setTextColor(bleu);
  doc.setFontSize(20);
  doc.text(`${CONFIG.nomApp} — Rapport élève`, 40, 50);
  doc.setTextColor("#555");
  doc.setFontSize(10);
  doc.text(`Généré le ${formatDate(Date.now())}`, 40, 66);

  doc.setTextColor("#111");
  doc.setFontSize(14);
  doc.text(`${e.prenom} ${e.nom}`, 40, 100);
  doc.setFontSize(11);
  const infos = [
    `Classe : ${e.classe}${e.groupe ? ` — Groupe : ${e.groupe}` : ""}`,
    `Téléphone : ${e.telephone}`,
    `Séances du cycle en cours : ${e.sessionsInCurrentCycle} / ${d.reglages.seancesParPaiement}`,
    `Total séances réalisées : ${e.totalSeancesRealisees}`,
    `Présences : ${seances.filter((s) => s.statut === "P").length} · Absences : ${seances.filter((s) => s.statut === "A").length} · Retards : ${seances.filter((s) => s.statut === "R").length}`,
  ];
  infos.forEach((t, i) => doc.text(t, 40, 120 + i * 16));

  autoTable(doc, {
    startY: 120 + infos.length * 16 + 14,
    head: [["Date", "Heure", "Durée", "Statut", "Commentaire"]],
    body: seances.map((s) => [formatDate(s.date), s.heure, `${formatDuree(s.dureeHeures)} h`, STATUT[s.statut], s.commentaire]),
    headStyles: { fillColor: bleu },
    styles: { fontSize: 9 },
    margin: { left: 40, right: 40 },
  });

  const total = paiements.reduce((s, p) => s + p.montant, 0);
  autoTable(doc, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY: ((doc as any).lastAutoTable?.finalY ?? 200) + 24,
    head: [["Date", "Montant", "Mode", "Séances", "Observation"]],
    body: paiements.map((p) => [formatDate(p.date), `${m(p.montant)} ${devise}`, p.modePaiement, String(p.nbSeancesReglees), p.observation]),
    foot: [["Total", `${m(total)} ${devise}`, "", "", ""]],
    headStyles: { fillColor: bleu },
    footStyles: { fillColor: "#eef2f7", textColor: "#111" },
    styles: { fontSize: 9 },
    margin: { left: 40, right: 40 },
  });

  doc.save(`Rapport_${e.prenom}_${e.nom}.pdf`.replace(/[^\w.\-]+/g, "_"));
}
