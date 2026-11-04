import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { marque } from "./marque";
import type { Donnees, Eleve, Paiement } from "./types";
import { formatDate, formatDuree, formatMontant } from "./utils";

const STATUT: Record<string, string> = { P: "Présent", A: "Absent", R: "Retard", J: "Absence justifiée" };

/** Rapport PDF d'un élève (toutes les séances et tous les paiements, sur plusieurs pages si besoin). */
export function rapportEleve(d: Donnees, e: Eleve) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const mq = marque(d);
  const bleu = mq.couleur;
  const seances = d.seances.filter((s) => s.eleveId === e.id).sort((a, b) => b.date - a.date);
  const paiements = d.paiements.filter((p) => p.eleveId === e.id).sort((a, b) => b.date - a.date);
  const devise = d.reglages.devise;
  // Les polices par défaut de jsPDF ne gèrent pas les espaces fines insécables
  const m = (n: number) => formatMontant(n).replace(/[  ]/g, " ");

  doc.setTextColor(bleu);
  doc.setFontSize(20);
  if (mq.logo.startsWith("data:")) { try { doc.addImage(mq.logo, "PNG", 515, 22, 40, 40); } catch { /* logo illisible */ } }
  doc.text(`${mq.nom} — Rapport élève`, 40, 50);
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
  const mq = marque(d);
  const couleur = mq.couleur;
  const devise = d.reglages.devise;
  const m = (n: number) => formatMontant(n).replace(/[  ]/g, " ");
  const num = numeroRecu(d, p);
  const largeur = doc.internal.pageSize.getWidth();

  doc.setFillColor(couleur);
  doc.rect(0, 0, largeur, 70, "F");
  doc.setTextColor("#ffffff");
  doc.setFontSize(20);
  // Logo personnalisé dans un carré blanc, puis nom et sous-titre
  let x = 30;
  if (mq.logo.startsWith("data:")) {
    try { doc.setFillColor("#ffffff"); doc.roundedRect(24, 13, 44, 44, 6, 6, "F"); doc.addImage(mq.logo, "PNG", 26, 15, 40, 40); x = 78; } catch { /* logo illisible */ }
  }
  doc.text(mq.nom.slice(0, 28), x, 40);
  doc.setFontSize(10);
  doc.text(mq.slogan.slice(0, 40), x, 56);
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

/** Bilan pédagogique d'un élève (à envoyer aux parents) : présences, notes, chapitres travaillés. */
export function bilanEleve(d: Donnees, e: Eleve): { blob: Blob; nom: string } {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const mq = marque(d);
  const couleur = mq.couleur;
  const L = doc.internal.pageSize.getWidth();
  const memeGroupe = (g: string) => g.trim().toLowerCase() === e.groupe.trim().toLowerCase();

  doc.setFillColor(couleur);
  doc.rect(0, 0, L, 80, "F");
  let x = 40;
  if (mq.logo.startsWith("data:")) { try { doc.setFillColor("#ffffff"); doc.roundedRect(34, 16, 48, 48, 6, 6, "F"); doc.addImage(mq.logo, "PNG", 36, 18, 44, 44); x = 94; } catch { /* ignore */ } }
  doc.setTextColor("#ffffff");
  doc.setFontSize(18); doc.text(mq.nom.slice(0, 40), x, 42);
  doc.setFontSize(10); doc.text(mq.slogan.slice(0, 60), x, 60);
  doc.setFontSize(12); doc.text("BILAN DE SUIVI", L - 40, 42, { align: "right" });
  doc.setFontSize(10); doc.text(`Établi le ${formatDate(Date.now())}`, L - 40, 60, { align: "right" });

  doc.setTextColor("#111111");
  doc.setFontSize(16); doc.text(`${e.prenom} ${e.nom}`, 40, 115);
  doc.setFontSize(11); doc.setTextColor("#555555");
  doc.text([e.classe, e.groupe].filter(Boolean).join(" · "), 40, 133);

  // Présences
  const seances = d.seances.filter((s) => s.eleveId === e.id);
  const nb = (st: string) => seances.filter((s) => s.statut === st).length;
  const taux = seances.length ? Math.round(((nb("P") + nb("R")) / seances.length) * 100) : 0;
  // Notes
  const evals = d.evaluations.filter((ev) => memeGroupe(ev.groupe) && typeof ev.notes[e.id] === "number").sort((a, b) => a.date - b.date);
  const moyenne = evals.length ? evals.reduce((s, ev) => s + ((ev.notes[e.id] as number) / ev.sur) * 20, 0) / evals.length : null;
  const f = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/[  ]/g, " ");

  // Encadrés résumé
  const cases: [string, string][] = [
    ["Présence", seances.length ? `${taux} %` : "—"],
    ["Séances suivies", String(nb("P") + nb("R"))],
    ["Absences", `${nb("A")}${nb("J") ? ` (+${nb("J")} justifiée${nb("J") > 1 ? "s" : ""})` : ""}`],
    ["Moyenne", moyenne === null ? "—" : `${f(moyenne)} / 20`],
  ];
  const lc = (L - 80 - 30) / 4;
  cases.forEach(([t, v], i) => {
    const cx = 40 + i * (lc + 10);
    doc.setDrawColor("#dddddd"); doc.roundedRect(cx, 150, lc, 54, 6, 6, "S");
    doc.setFontSize(9); doc.setTextColor("#777777"); doc.text(t, cx + 10, 168);
    doc.setFontSize(14); doc.setTextColor(couleur); doc.text(v, cx + 10, 192);
  });

  autoTable(doc, {
    startY: 225,
    head: [["Évaluation", "Date", "Note", "Moyenne du groupe"]],
    body: evals.length ? evals.map((ev) => {
      const n = Object.values(ev.notes).filter((x): x is number => typeof x === "number");
      const mg = n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
      return [ev.titre, formatDate(ev.date), `${f(ev.notes[e.id] as number)} / ${ev.sur}`, mg === null ? "—" : `${f(mg)} / ${ev.sur}`];
    }) : [["Aucune évaluation notée", "", "", ""]],
    headStyles: { fillColor: couleur }, styles: { fontSize: 9 }, margin: { left: 40, right: 40 },
  });

  const cahier = d.cahier.filter((c) => memeGroupe(c.groupe)).sort((a, b) => b.date - a.date).slice(0, 10);
  autoTable(doc, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY: ((doc as any).lastAutoTable?.finalY ?? 260) + 20,
    head: [["Date", "Travail en séance", "Devoirs"]],
    body: cahier.length ? cahier.map((c) => [formatDate(c.date), c.chapitre, c.devoirs]) : [["", "Cahier de texte vide", ""]],
    headStyles: { fillColor: couleur }, styles: { fontSize: 9 }, margin: { left: 40, right: 40 },
    columnStyles: { 0: { cellWidth: 70 } },
  });

  const dernieres = [...seances].sort((a, b) => b.date - a.date).slice(0, 12);
  autoTable(doc, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY: ((doc as any).lastAutoTable?.finalY ?? 400) + 20,
    head: [["Dernières séances", "Présence"]],
    body: dernieres.length ? dernieres.map((s) => [`${formatDate(s.date)} à ${s.heure}${s.groupe === "Rattrapage" ? " (rattrapage)" : ""}`, STATUT[s.statut]]) : [["Aucune séance", ""]],
    headStyles: { fillColor: couleur }, styles: { fontSize: 9 }, margin: { left: 40, right: 40 },
  });

  if (e.observation) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const y = ((doc as any).lastAutoTable?.finalY ?? 600) + 24;
    doc.setFontSize(10); doc.setTextColor("#111111");
    doc.text(doc.splitTextToSize(`Observation : ${e.observation}`, L - 80), 40, y);
  }
  doc.setFontSize(8); doc.setTextColor("#999999");
  doc.text(`${mq.nom} — bilan de ${e.prenom} ${e.nom}`, L / 2, doc.internal.pageSize.getHeight() - 24, { align: "center" });
  return { blob: doc.output("blob"), nom: `Bilan_${e.prenom}_${e.nom}_${new Date().toISOString().slice(0, 10)}`.replace(/[^\w.\-]+/g, "_") + ".pdf" };
}
