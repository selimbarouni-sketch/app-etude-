import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CONFIG } from "./config";
import type { Donnees, Eleve, Paiement } from "./types";
import { formatDate, formatDuree, formatMontant } from "./utils";

const STATUT: Record<string, string> = { P: "Présent", A: "Absent", R: "Retard", J: "Absence justifiée" };

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

/** Numéro de reçu : année + rang du paiement dans l'année (ex. 2026-0007). */
export function numeroRecu(d: Donnees, p: Paiement): string {
  const annee = new Date(p.date).getFullYear();
  const rang = d.paiements
    .filter((x) => new Date(x.date).getFullYear() === annee)
    .sort((a, b) => a.date - b.date || a.id.localeCompare(b.id))
    .findIndex((x) => x.id === p.id) + 1;
  return `${annee}-${String(rang).padStart(4, "0")}`;
}

/** Reçu de paiement au format PDF (A5). */
export function recuPaiement(d: Donnees, p: Paiement): { blob: Blob; nom: string } {
  const doc = new jsPDF({ unit: "pt", format: "a5" });
  const couleur = d.reglages.style === "chic" ? CONFIG.couleurChic : CONFIG.couleurPrincipale;
  const devise = d.reglages.devise;
  const m = (n: number) => formatMontant(n).replace(/[  ]/g, " ");
  const num = numeroRecu(d, p);
  const largeur = doc.internal.pageSize.getWidth();

  doc.setFillColor(couleur);
  doc.rect(0, 0, largeur, 70, "F");
  doc.setTextColor("#ffffff");
  doc.setFontSize(20);
  doc.text(CONFIG.nomApp, 30, 40);
  doc.setFontSize(10);
  doc.text(CONFIG.slogan, 30, 56);
  doc.setFontSize(12);
  doc.text("REÇU DE PAIEMENT", largeur - 30, 40, { align: "right" });
  doc.setFontSize(10);
  doc.text(`N° ${num}`, largeur - 30, 56, { align: "right" });

  doc.setTextColor("#111111");
  doc.setFontSize(11);
  let y = 105;
  const ligne = (libelle: string, valeur: string) => {
    doc.setTextColor("#666666"); doc.text(libelle, 30, y);
    doc.setTextColor("#111111"); doc.text(valeur, 160, y);
    y += 22;
  };
  ligne("Date", formatDate(p.date));
  ligne("Élève", p.nomEleve);
  if (p.groupe) ligne("Groupe", p.groupe);
  ligne("Séances réglées", String(p.nbSeancesReglees));
  ligne("Mode de paiement", p.modePaiement);
  if (p.observation) ligne("Observation", p.observation.slice(0, 50));

  y += 8;
  doc.setDrawColor(couleur);
  doc.setLineWidth(1.5);
  doc.roundedRect(30, y, largeur - 60, 56, 6, 6, "S");
  doc.setFontSize(11);
  doc.setTextColor("#666666");
  doc.text("Montant payé", 46, y + 24);
  doc.setFontSize(22);
  doc.setTextColor(couleur);
  doc.text(`${m(p.montant)} ${devise}`, largeur - 46, y + 36, { align: "right" });
  if (p.encaisse === false) {
    doc.setFontSize(9); doc.setTextColor("#b26a00");
    doc.text("Paiement enregistré, en attente d'encaissement", 46, y + 44);
  }

  doc.setFontSize(9);
  doc.setTextColor("#888888");
  doc.text("Merci pour votre confiance.", largeur / 2, doc.internal.pageSize.getHeight() - 30, { align: "center" });

  const nom = `Recu_${num}_${p.nomEleve}`.replace(/[^\w.\-]+/g, "_") + ".pdf";
  return { blob: doc.output("blob"), nom };
}
