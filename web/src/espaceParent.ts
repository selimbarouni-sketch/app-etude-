import { marque } from "./marque";
import { absencesConsecutives, prixSeance, prochainesSeances } from "./store";
import type { Donnees, Eleve } from "./types";

/** Données visibles par le parent (lecture seule) : uniquement ce qui concerne son enfant. */
export interface EspaceParentDonnees {
  maj: string;
  prof: { nom: string; slogan: string; couleur: string; logo: string };
  eleve: { prenom: string; nom: string; classe: string; groupe: string };
  devise: string;
  creneau?: string;
  prochaines: { date: number; heure: string; reportee: boolean }[];
  annulees: { date: number; motif: string }[];
  presences: { date: number; heure: string; statut: string }[];
  stats: { presents: number; absents: number; justifiees: number; retards: number; absencesDeSuite: number };
  paiement: { seancesAPayer: number; credit: number; montantDu: number };
  paiements: { date: number; montant: number; seances: number }[];
  notes: { date: number; titre: string; note: number; sur: number }[];
  moyenne: number | null;
  cahier: { date: number; chapitre: string; devoirs: string; pourLe?: number }[];
}

export function construireEspace(d: Donnees, e: Eleve): EspaceParentDonnees {
  const mq = marque(d);
  const memeGroupe = (g: string) => g.trim().toLowerCase() === e.groupe.trim().toLowerCase();
  const g = d.groupes.find((x) => memeGroupe(x.nom));
  const seances = d.seances.filter((s) => s.eleveId === e.id).sort((a, b) => b.date - a.date);
  const evals = d.evaluations.filter((x) => memeGroupe(x.groupe) && typeof x.notes[e.id] === "number").sort((a, b) => b.date - a.date);
  const notes = evals.map((x) => ({ date: x.date, titre: x.titre, note: x.notes[e.id] as number, sur: x.sur }));
  const moyenne = notes.length ? notes.reduce((s, n) => s + (n.note / n.sur) * 20, 0) / notes.length : null;
  const nb = (st: string) => seances.filter((s) => s.statut === st).length;
  const now = Date.now();
  const annulees = (g?.exceptions ?? []).filter((x) => x.type === "annulee" && x.date + 86_400_000 > now).map((x) => ({ date: x.date, motif: x.motif }))
    .concat(d.vacances.filter((v) => v.fin + 86_400_000 > now).map((v) => ({ date: v.debut, motif: v.motif })));
  return {
    maj: new Date().toISOString(),
    prof: { nom: mq.nom, slogan: mq.slogan, couleur: mq.couleur, logo: mq.logo.startsWith("data:") ? mq.logo : "" },
    eleve: { prenom: e.prenom, nom: e.nom, classe: e.classe, groupe: e.groupe },
    devise: d.reglages.devise,
    creneau: g ? `Chaque ${g.jourSemaine.toLowerCase()} · ${g.heureDebut}–${g.heureFin}${g.lieu ? ` · ${g.lieu}` : ""}` : undefined,
    prochaines: g ? prochainesSeances(d, now, g.id, 4).map((s) => ({ date: s.debut, heure: s.heureDebut, reportee: !!s.reportDe })) : [],
    annulees,
    presences: seances.slice(0, 20).map((s) => ({ date: s.date, heure: s.heure, statut: s.statut })),
    stats: { presents: nb("P"), absents: nb("A"), justifiees: nb("J"), retards: nb("R"), absencesDeSuite: absencesConsecutives(d, e).nb },
    paiement: {
      seancesAPayer: Math.max(0, e.sessionsInCurrentCycle),
      credit: Math.max(0, -e.sessionsInCurrentCycle),
      montantDu: Math.max(0, e.sessionsInCurrentCycle) * prixSeance(d, e),
    },
    paiements: d.paiements.filter((p) => p.eleveId === e.id && p.encaisse !== false).sort((a, b) => b.date - a.date).slice(0, 10)
      .map((p) => ({ date: p.date, montant: p.montant, seances: p.nbSeancesReglees })),
    notes, moyenne,
    cahier: d.cahier.filter((c) => memeGroupe(c.groupe)).sort((a, b) => b.date - a.date).slice(0, 8)
      .map((c) => ({ date: c.date, chapitre: c.chapitre, devoirs: c.devoirs, pourLe: c.pourLe })),
  };
}

/** Jeton aléatoire non devinable (lien privé). */
export function nouveauJeton(): string {
  const o = new Uint8Array(18);
  crypto.getRandomValues(o);
  return Array.from(o, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 28);
}
