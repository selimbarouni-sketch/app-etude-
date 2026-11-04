import { useSyncExternalStore } from "react";
import { CONFIG } from "./config";
import type { Attente, Donnees, EntreeCahier, Eleve, Evaluation, ExceptionSeance, Groupe, Note, Paiement, Rattrapage, Reglages, Seance, Statut, Vacances } from "./types";
import { debutDuJour, jourSemaine, uid } from "./utils";

/**
 * Les données sont enregistrées dans le navigateur (localStorage) de l'appareil.
 * Pensez à faire des sauvegardes régulières (Paramètres > Sauvegarde).
 */
const CLE = "profsuivi-donnees-v1";

export const REGLAGES_DEFAUT: Reglages = {
  seancesParPaiement: 4,
  tarifForfait: 100,
  dureeParDefautHeures: 2,
  devise: CONFIG.deviseParDefaut,
  theme: "auto",
  style: "classique",
  smsTemplateRappel: "Bonjour {prenom}, petit rappel concernant votre cours de {classe} à {heure}. Merci !",
  smsTemplatePaiement: "Bonjour {prenom}, vous avez effectué {seances} séances : merci de prévoir le paiement du forfait ({montant} {devise}). Merci !",
  relanceJours: 3,
  absencesComptees: false,
  seuilAbsences: 2,
  smsTemplateAbsence: "Bonjour, {prenom} a été absent(e) aux {nb} dernières séances du groupe {groupe}. Tout va bien ? Merci de me tenir informé(e).",
};

function donneesInitiales(): Donnees {
  return {
    version: 1,
    eleves: [],
    groupes: CONFIG.groupesExemple.map((g) => ({ ...g, id: uid(), remarque: "", prochaineSeance: 0 })),
    rendezVous: [],
    seances: [],
    paiements: [],
    dossiers: [],
    notes: [],
    vacances: [],
    evaluations: [],
    cahier: [],
    rattrapages: [],
    reglages: { ...REGLAGES_DEFAUT },
  };
}

function normaliser(d: Partial<Donnees>): Donnees {
  const base = donneesInitiales();
  return {
    version: 1,
    eleves: d.eleves ?? [],
    groupes: d.groupes ?? base.groupes,
    rendezVous: d.rendezVous ?? [],
    seances: d.seances ?? [],
    paiements: d.paiements ?? [],
    dossiers: d.dossiers ?? [],
    notes: d.notes ?? [],
    vacances: d.vacances ?? [],
    evaluations: d.evaluations ?? [],
    cahier: d.cahier ?? [],
    rattrapages: d.rattrapages ?? [],
    reglages: { ...REGLAGES_DEFAUT, ...(d.reglages ?? {}) },
  };
}

function charger(): Donnees {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) return normaliser(JSON.parse(brut));
  } catch {
    /* stockage indisponible : on démarre à vide */
  }
  return donneesInitiales();
}

let etat: Donnees = charger();
const abonnes = new Set<() => void>();
export let erreurSauvegarde = false;

/** Appelés à chaque modification faite sur cet appareil (pour la synchronisation en ligne). */
const surModificationLocale = new Set<() => void>();
export const ecouterModifications = (cb: () => void) => {
  surModificationLocale.add(cb);
  return () => surModificationLocale.delete(cb);
};

function enregistrer() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
    erreurSauvegarde = false;
  } catch {
    erreurSauvegarde = true;
  }
  abonnes.forEach((cb) => cb());
}

function maj(f: (d: Donnees) => Donnees) {
  etat = f(etat);
  enregistrer();
  surModificationLocale.forEach((cb) => cb());
}

/** Remplace les données par celles venues du serveur (sans déclencher de nouvel envoi). */
export function remplacerDepuisServeur(d: unknown) {
  etat = normaliser(d as Partial<Donnees>);
  enregistrer();
}

// Synchronise plusieurs onglets ouverts
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === CLE) {
      etat = charger();
      abonnes.forEach((cb) => cb());
    }
  });
}

export function useDonnees(): Donnees {
  return useSyncExternalStore(
    (cb) => {
      abonnes.add(cb);
      return () => abonnes.delete(cb);
    },
    () => etat
  );
}

export const getDonnees = () => etat;

/** Séance due (comptée pour le paiement) : présence, retard, et absence non justifiée si le réglage le prévoit. */
const compte = (s: Statut) => s === "P" || s === "R" || (s === "A" && etat.reglages.absencesComptees);

export const actions = {
  // ---------- Élèves ----------
  ajouterEleve(e: Omit<Eleve, "id" | "dateInscription" | "sessionsInCurrentCycle" | "totalSeancesRealisees">) {
    maj((d) => ({
      ...d,
      eleves: [...d.eleves, { ...e, id: uid(), dateInscription: Date.now(), sessionsInCurrentCycle: 0, totalSeancesRealisees: 0 }],
    }));
  },
  modifierEleve(e: Eleve) {
    maj((d) => ({ ...d, eleves: d.eleves.map((x) => (x.id === e.id ? e : x)) }));
  },
  supprimerEleve(id: string) {
    maj((d) => ({ ...d, eleves: d.eleves.filter((x) => x.id !== id) }));
  },

  // ---------- Groupes ----------
  ajouterGroupe(g: Omit<Groupe, "id" | "prochaineSeance" | "remarque"> & { remarque?: string }): Groupe {
    const groupe: Groupe = { remarque: "", ...g, id: uid(), prochaineSeance: 0 };
    maj((d) => ({ ...d, groupes: [...d.groupes, groupe] }));
    return groupe;
  },
  /** Modifie un groupe ; si le nom change, les élèves du groupe suivent. */
  modifierGroupe(g: Groupe) {
    maj((d) => {
      const ancien = d.groupes.find((x) => x.id === g.id);
      const renomme = ancien && ancien.nom !== g.nom;
      return {
        ...d,
        groupes: d.groupes.map((x) => (x.id === g.id ? g : x)),
        eleves: renomme ? d.eleves.map((e) => (e.groupe.toLowerCase() === ancien!.nom.toLowerCase() ? { ...e, groupe: g.nom } : e)) : d.eleves,
      };
    });
  },
  supprimerGroupe(id: string, retirerEleves = true) {
    maj((d) => {
      const g = d.groupes.find((x) => x.id === id);
      return {
        ...d,
        groupes: d.groupes.filter((x) => x.id !== id),
        eleves: g && retirerEleves ? d.eleves.map((e) => (e.groupe.toLowerCase() === g.nom.toLowerCase() ? { ...e, groupe: "" } : e)) : d.eleves,
      };
    });
  },
  /** Annule ou reporte une séance d'un groupe. */
  ajouterException(groupeId: string, e: Omit<ExceptionSeance, "id">) {
    maj((d) => ({
      ...d,
      groupes: d.groupes.map((g) => g.id === groupeId
        ? { ...g, exceptions: [...(g.exceptions ?? []).filter((x) => x.date !== e.date), { ...e, id: uid() }] }
        : g),
    }));
  },
  /** Rétablit la séance (supprime l'annulation / le report). */
  supprimerException(groupeId: string, exceptionId: string) {
    maj((d) => ({
      ...d,
      groupes: d.groupes.map((g) => g.id === groupeId ? { ...g, exceptions: (g.exceptions ?? []).filter((x) => x.id !== exceptionId) } : g),
    }));
  },
  ajouterVacances(v: Omit<Vacances, "id">) {
    maj((d) => ({ ...d, vacances: [...d.vacances, { ...v, id: uid() }].sort((a, b) => a.debut - b.debut) }));
  },
  supprimerVacances(id: string) {
    maj((d) => ({ ...d, vacances: d.vacances.filter((v) => v.id !== id) }));
  },
  /** L'alerte d'absences de cet élève a été traitée (message envoyé ou ignorée). */
  traiterAlerteAbsence(eleveId: string) {
    maj((d) => ({ ...d, eleves: d.eleves.map((e) => (e.id === eleveId ? { ...e, alerteAbsenceVue: Date.now() } : e)) }));
  },
  // ---------- Suivi pédagogique ----------
  enregistrerEvaluation(e: Omit<Evaluation, "id"> & { id?: string }) {
    maj((d) => e.id
      ? { ...d, evaluations: d.evaluations.map((x) => (x.id === e.id ? { ...x, ...e, id: x.id } : x)) }
      : { ...d, evaluations: [...d.evaluations, { ...e, id: uid() }] });
  },
  supprimerEvaluation(id: string) {
    maj((d) => ({ ...d, evaluations: d.evaluations.filter((x) => x.id !== id) }));
  },
  enregistrerCahier(c: Omit<EntreeCahier, "id"> & { id?: string }) {
    maj((d) => {
      // une entrée par groupe et par jour
      const existe = c.id ? d.cahier.find((x) => x.id === c.id) : d.cahier.find((x) => x.groupe === c.groupe && debutDuJour(x.date) === debutDuJour(c.date));
      if (existe) return { ...d, cahier: d.cahier.map((x) => (x.id === existe.id ? { ...x, ...c, id: x.id } : x)) };
      return { ...d, cahier: [...d.cahier, { ...c, id: uid() }] };
    });
  },
  supprimerCahier(id: string) {
    maj((d) => ({ ...d, cahier: d.cahier.filter((x) => x.id !== id) }));
  },

  // ---------- Rattrapages ----------
  ajouterRattrapage(r: Omit<Rattrapage, "id" | "statut">) {
    maj((d) => ({ ...d, rattrapages: [...d.rattrapages, { ...r, id: uid() }] }));
  },
  supprimerRattrapage(id: string) {
    maj((d) => ({ ...d, rattrapages: d.rattrapages.filter((x) => x.id !== id || x.statut) }));
  },
  /** Appel du rattrapage : enregistre la séance dans l'historique (et le compteur si elle est comptée). */
  validerRattrapage(id: string, statut: Statut): Eleve[] {
    const r = etat.rattrapages.find((x) => x.id === id);
    const e = r && etat.eleves.find((x) => x.id === r.eleveId);
    if (!r || !e || r.statut) return [];
    const compteePaiement = r.comptee && compte(statut);
    const limite = etat.reglages.seancesParPaiement;
    const atteint = compteePaiement && e.sessionsInCurrentCycle < limite && e.sessionsInCurrentCycle + 1 >= limite;
    const [a, b] = r.heureDebut.split(":").map(Number); const [c, f] = r.heureFin.split(":").map(Number);
    maj((d) => ({
      ...d,
      rattrapages: d.rattrapages.map((x) => (x.id === id ? { ...x, statut } : x)),
      seances: [{ id: uid(), eleveId: e.id, date: r.debut, heure: r.heureDebut, dureeHeures: Math.max(0.5, ((c * 60 + f) - (a * 60 + b)) / 60),
        statut, commentaire: `Rattrapage${r.motif ? ` : ${r.motif}` : ""}${r.comptee ? "" : " (non compté)"}`, nomEleve: `${e.prenom} ${e.nom}`, groupe: "Rattrapage" }, ...d.seances],
      eleves: compteePaiement
        ? d.eleves.map((x) => (x.id === e.id ? { ...x, sessionsInCurrentCycle: x.sessionsInCurrentCycle + 1, totalSeancesRealisees: x.totalSeancesRealisees + 1 } : x))
        : d.eleves,
    }));
    return atteint ? [e] : [];
  },

  // ---------- Capacité & liste d'attente ----------
  ajouterAttente(groupeId: string, a: Omit<Attente, "id" | "date">) {
    maj((d) => ({ ...d, groupes: d.groupes.map((g) => (g.id === groupeId ? { ...g, listeAttente: [...(g.listeAttente ?? []), { ...a, id: uid(), date: Date.now() }] } : g)) }));
  },
  retirerAttente(groupeId: string, attenteId: string) {
    maj((d) => ({ ...d, groupes: d.groupes.map((g) => (g.id === groupeId ? { ...g, listeAttente: (g.listeAttente ?? []).filter((x) => x.id !== attenteId) } : g)) }));
  },
  /** Inscrit un élève de la liste d'attente dans le groupe. */
  inscrireDepuisAttente(groupeId: string, attenteId: string) {
    const g = etat.groupes.find((x) => x.id === groupeId);
    const a = g?.listeAttente?.find((x) => x.id === attenteId);
    if (!g || !a) return;
    maj((d) => ({
      ...d,
      groupes: d.groupes.map((x) => (x.id === groupeId ? { ...x, listeAttente: (x.listeAttente ?? []).filter((y) => y.id !== attenteId) } : x)),
      eleves: [...d.eleves, { id: uid(), prenom: a.prenom, nom: a.nom, telephone: a.telephone, telephoneParent: a.telephoneParent, contactMessages: a.telephoneParent ? "parent" : "eleve",
        classe: "", groupe: g.nom, anniversaire: "", observation: "", dateInscription: Date.now(), sessionsInCurrentCycle: 0, totalSeancesRealisees: 0 }],
    }));
  },

  // ---------- Espace parents ----------
  definirLienParent(eleveId: string, jeton: string | undefined) {
    maj((d) => ({ ...d, eleves: d.eleves.map((e) => (e.id === eleveId ? { ...e, lienParent: jeton } : e)) }));
  },

  // ---------- Nouvelle année scolaire ----------
  /** Repart à zéro : historique, paiements, notes, cahier… effacés ; groupes et élèves conservés. */
  nouvelleAnnee(options: { garderSoldes: boolean; garderEleves: boolean }) {
    maj((d) => ({
      ...d,
      seances: [], paiements: [], evaluations: [], cahier: [], rattrapages: [], vacances: [],
      groupes: d.groupes.map((g) => ({ ...g, exceptions: [], prochaineSeance: 0 })),
      eleves: options.garderEleves
        ? d.eleves.map((e) => ({ ...e, sessionsInCurrentCycle: options.garderSoldes ? e.sessionsInCurrentCycle : 0, totalSeancesRealisees: 0,
            dernierRappel: undefined, alerteAbsenceVue: undefined }))
        : [],
    }));
  },

  /** Place des élèves existants dans un groupe (un élève n'appartient qu'à un groupe). */
  affecterEleves(nomGroupe: string, ids: string[]) {
    const set = new Set(ids);
    maj((d) => ({ ...d, eleves: d.eleves.map((e) => (set.has(e.id) ? { ...e, groupe: nomGroupe } : e)) }));
  },
  retirerDuGroupe(id: string) {
    maj((d) => ({ ...d, eleves: d.eleves.map((e) => (e.id === id ? { ...e, groupe: "" } : e)) }));
  },
  /** Crée plusieurs élèves d'un coup. */
  ajouterEleves(liste: Omit<Eleve, "id" | "dateInscription" | "sessionsInCurrentCycle" | "totalSeancesRealisees">[]) {
    const now = Date.now();
    maj((d) => ({
      ...d,
      eleves: [...d.eleves, ...liste.map((e) => ({ ...e, id: uid(), dateInscription: now, sessionsInCurrentCycle: 0, totalSeancesRealisees: 0 }))],
    }));
  },

  // ---------- Séances ----------
  /**
   * Enregistre l'appel. Renvoie les élèves qui viennent d'atteindre le nombre de séances
   * à payer (pour envoyer la notification « paiement attendu »).
   */
  enregistrerAppel(seances: Omit<Seance, "id">[]): Eleve[] {
    const limite = etat.reglages.seancesParPaiement;
    const parEleve = new Map<string, number>();
    seances.forEach((s) => compte(s.statut) && parEleve.set(s.eleveId, (parEleve.get(s.eleveId) ?? 0) + 1));
    const atteints = etat.eleves.filter((e) => {
      const n = parEleve.get(e.id) ?? 0;
      return n > 0 && e.sessionsInCurrentCycle < limite && e.sessionsInCurrentCycle + n >= limite;
    });
    maj((d) => ({
      ...d,
      seances: [...seances.map((s) => ({ ...s, id: uid() })), ...d.seances],
      eleves: d.eleves.map((e) => {
        const n = parEleve.get(e.id) ?? 0;
        return n ? { ...e, sessionsInCurrentCycle: e.sessionsInCurrentCycle + n, totalSeancesRealisees: e.totalSeancesRealisees + n } : e;
      }),
    }));
    return atteints;
  },
  /** Correction le jour même : supprime l'appel d'un groupe (les compteurs sont rétablis) pour le refaire. */
  annulerAppel(groupe: string, jour: number) {
    maj((d) => {
      const cibles = appelDuJour(d, groupe, jour);
      const ids = new Set(cibles.map((s) => s.id));
      const parEleve = new Map<string, number>();
      cibles.forEach((s) => compte(s.statut) && parEleve.set(s.eleveId, (parEleve.get(s.eleveId) ?? 0) + 1));
      return {
        ...d,
        seances: d.seances.filter((s) => !ids.has(s.id)),
        eleves: d.eleves.map((e) => {
          const n = parEleve.get(e.id) ?? 0;
          return n ? { ...e, sessionsInCurrentCycle: e.sessionsInCurrentCycle - n, totalSeancesRealisees: Math.max(0, e.totalSeancesRealisees - n) } : e;
        }),
      };
    });
  },
  // ---------- Paiements ----------
  enregistrerPaiement(p: { eleve: Eleve; montant: number; modePaiement: string; nbSeances: number; observation: string; encaisse?: boolean }): Paiement {
    const id = uid();
    maj((d) => ({
      ...d,
      paiements: [
        {
          id,
          eleveId: p.eleve.id,
          nomEleve: `${p.eleve.prenom} ${p.eleve.nom}`,
          groupe: p.eleve.groupe,
          date: Date.now(),
          montant: p.montant,
          modePaiement: p.modePaiement,
          nbSeancesReglees: p.nbSeances,
          observation: p.observation,
          encaisse: p.encaisse ?? true,
        },
        ...d.paiements,
      ],
      // On déduit les séances réglées ; si on paie d'avance, le compteur devient négatif (= crédit)
      eleves: d.eleves.map((e) => (e.id === p.eleve.id ? { ...e, sessionsInCurrentCycle: e.sessionsInCurrentCycle - p.nbSeances, dernierRappel: undefined } : e)),
    }));
    return etat.paiements.find((x) => x.id === id)!;
  },
  /** Modifie un versement ; si le nombre de séances réglées change, le compteur de l'élève est corrigé. */
  modifierPaiement(p: Paiement) {
    maj((d) => {
      const ancien = d.paiements.find((x) => x.id === p.id);
      const delta = ancien ? ancien.nbSeancesReglees - p.nbSeancesReglees : 0;
      return {
        ...d,
        paiements: d.paiements.map((x) => (x.id === p.id ? p : x)),
        eleves: delta ? d.eleves.map((e) => (e.id === p.eleveId ? { ...e, sessionsInCurrentCycle: e.sessionsInCurrentCycle + delta } : e)) : d.eleves,
      };
    });
  },
  supprimerPaiement(id: string) {
    maj((d) => {
      const p = d.paiements.find((x) => x.id === id);
      if (!p) return d;
      return {
        ...d,
        paiements: d.paiements.filter((x) => x.id !== id),
        // annulation : les séances redeviennent dues
        eleves: d.eleves.map((e) => (e.id === p.eleveId ? { ...e, sessionsInCurrentCycle: e.sessionsInCurrentCycle + p.nbSeancesReglees } : e)),
      };
    });
  },

  /** Note qu'un rappel de paiement a été envoyé à l'élève (pour la prochaine relance). */
  noterRappel(eleveId: string) {
    maj((d) => ({ ...d, eleves: d.eleves.map((e) => (e.id === eleveId ? { ...e, dernierRappel: Date.now() } : e)) }));
  },

  // ---------- Notes ----------
  enregistrerNote(n: Omit<Note, "id" | "date"> & { id?: string }) {
    maj((d) => {
      if (n.id) return { ...d, notes: d.notes.map((x) => (x.id === n.id ? { ...x, ...n, id: x.id, date: Date.now() } : x)) };
      return { ...d, notes: [{ ...n, id: uid(), date: Date.now() }, ...d.notes] };
    });
  },
  basculerFavori(id: string) {
    maj((d) => ({ ...d, notes: d.notes.map((x) => (x.id === id ? { ...x, estFavori: !x.estFavori } : x)) }));
  },
  supprimerNote(id: string) {
    maj((d) => ({ ...d, notes: d.notes.filter((x) => x.id !== id) }));
  },
  ajouterDossier(nom: string) {
    maj((d) => ({ ...d, dossiers: [...d.dossiers, { id: uid(), nom }] }));
  },
  supprimerDossier(id: string) {
    maj((d) => ({
      ...d,
      dossiers: d.dossiers.filter((x) => x.id !== id),
      notes: d.notes.map((n) => (n.dossierId === id ? { ...n, dossierId: null } : n)),
    }));
  },

  // ---------- Réglages & sauvegarde ----------
  enregistrerReglages(r: Partial<Reglages>) {
    maj((d) => ({ ...d, reglages: { ...d.reglages, ...r } }));
  },
  exporterJson(): string {
    return JSON.stringify(etat, null, 2);
  },
  importerJson(texte: string) {
    const d = JSON.parse(texte);
    if (!d || typeof d !== "object" || !Array.isArray(d.eleves)) throw new Error("Fichier de sauvegarde invalide");
    maj(() => normaliser(d));
  },
  toutEffacer() {
    maj(() => donneesInitiales());
  },
};

// ---------- Sélecteurs ----------
export function elevesPaiementEnAttente(d: Donnees): Eleve[] {
  return d.eleves.filter((e) => e.sessionsInCurrentCycle >= d.reglages.seancesParPaiement);
}

export function heureProchainCours(d: Donnees, e: Eleve): string {
  const g = d.groupes.find((x) => x.nom.toLowerCase() === e.groupe.toLowerCase());
  if (!g) return "l'heure prévue";
  return prochainesSeances(d, Date.now(), g.id, 1)[0]?.heureDebut ?? g.heureDebut;
}

/** Séances enregistrées pour un groupe un jour donné (= l'appel de ce jour). */
export function appelDuJour(d: Donnees, groupe: string, jour: number): Seance[] {
  const debut = debutDuJour(jour);
  return d.seances.filter((s) => s.groupe.toLowerCase() === groupe.toLowerCase() && s.date >= debut && s.date < debut + 86_400_000);
}

/** Une séance d'un groupe un jour donné (créneau hebdomadaire, report ou annulation pris en compte). */
export interface SeanceProgrammee {
  groupe: Groupe;
  jour: number; // minuit
  heureDebut: string;
  heureFin: string;
  debut: number; // instant de début
  annulee?: ExceptionSeance;
  reportDe?: number; // jour d'origine si la séance a été reportée à ce jour
}

const ajouterMinutes = (heure: string, minutes: number) => {
  const [h, m] = heure.split(":").map(Number);
  const t = Math.max(0, Math.min(24 * 60 - 1, (h || 0) * 60 + (m || 0) + minutes));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};
const dureeMinutes = (g: Groupe) => {
  const [h1, m1] = g.heureDebut.split(":").map(Number);
  const [h2, m2] = g.heureFin.split(":").map(Number);
  const d = (h2 * 60 + m2) - (h1 * 60 + m1);
  return d > 0 ? d : 120;
};
const instant = (jour: number, heure: string) => {
  const [h, m] = heure.split(":").map(Number);
  const x = new Date(jour); x.setHours(h || 0, m || 0, 0, 0);
  return x.getTime();
};

/** Séances programmées un jour donné, triées par heure (les annulées sont incluses, marquées). */
export function seancesDuJour(d: Donnees, jour = Date.now()): SeanceProgrammee[] {
  const j = debutDuJour(jour);
  const nom = jourSemaine(j).toLowerCase();
  const res: SeanceProgrammee[] = [];
  const vac = vacancesLe(d, j);
  for (const g of d.groupes) {
    const exc = (g.exceptions ?? []).find((x) => x.date === j);
    if (g.jourSemaine.toLowerCase() === nom) {
      if (!exc) res.push({ groupe: g, jour: j, heureDebut: g.heureDebut, heureFin: g.heureFin, debut: instant(j, g.heureDebut) });
      else if (exc.type === "annulee") res.push({ groupe: g, jour: j, heureDebut: g.heureDebut, heureFin: g.heureFin, debut: instant(j, g.heureDebut), annulee: exc });
      // reportée : n'a plus lieu ce jour-là (sauf report le même jour à une autre heure, traité ci-dessous)
    }
    for (const x of g.exceptions ?? []) {
      if (x.type === "reportee" && x.nouvelleDate === j && x.nouvelleHeure) {
        res.push({ groupe: g, jour: j, heureDebut: x.nouvelleHeure, heureFin: ajouterMinutes(x.nouvelleHeure, dureeMinutes(g)), debut: instant(j, x.nouvelleHeure), reportDe: x.date });
      }
    }
  }
  // Vacances / jour férié : toutes les séances du jour sont annulées
  if (vac) res.forEach((s) => { if (!s.annulee) s.annulee = { id: vac.id, date: j, type: "annulee", motif: vac.motif || "Vacances" }; });
  return res.sort((a, b) => a.debut - b.debut);
}

export function vacancesLe(d: Donnees, jour: number): Vacances | undefined {
  const j = debutDuJour(jour);
  return d.vacances.find((v) => j >= v.debut && j <= v.fin);
}

/** Groupes qui ont cours ce jour-là (séances non annulées). */
export function groupesDuJour(d: Donnees, jour = Date.now()): Groupe[] {
  return seancesDuJour(d, jour).filter((s) => !s.annulee).map((s) => s.groupe);
}

/** Prochaines séances (non annulées) à partir de maintenant, sur les 3 semaines à venir. */
export function prochainesSeances(d: Donnees, depuis = Date.now(), groupeId?: string, max = 10): SeanceProgrammee[] {
  const res: SeanceProgrammee[] = [];
  for (let i = 0; i < 21 && res.length < max; i++) {
    const jour = debutDuJour(depuis) + i * 86_400_000 + 3_600_000; // +1 h : évite les décalages d'heure d'été
    for (const s of seancesDuJour(d, jour)) {
      if (s.annulee || (groupeId && s.groupe.id !== groupeId)) continue;
      if (s.debut + dureeMinutes(s.groupe) * 60_000 < depuis) continue;
      res.push(s);
    }
  }
  return res.slice(0, max);
}

/** Séances d'un groupe sur les semaines à venir (y compris annulées), pour choisir laquelle annuler/reporter. */
export function seancesAVenirDuGroupe(d: Donnees, g: Groupe, semaines = 6, depuis = Date.now()): SeanceProgrammee[] {
  const res: SeanceProgrammee[] = [];
  for (let i = 0; i < semaines * 7; i++) {
    const jour = debutDuJour(depuis) + i * 86_400_000 + 3_600_000;
    for (const s of seancesDuJour(d, jour)) if (s.groupe.id === g.id && s.debut + 60 * 60_000 > depuis) res.push(s);
  }
  return res;
}

/** Groupe d'un paiement : celui enregistré, sinon le groupe actuel de l'élève. */
export function groupeDuPaiement(d: Donnees, p: Paiement): string {
  if (p.groupe !== undefined) return p.groupe;
  return d.eleves.find((e) => e.id === p.eleveId)?.groupe ?? "";
}

/** Élèves qui doivent payer et à relancer (jamais relancés, ou dernier rappel plus vieux que N jours). */
export function relancesAFaire(d: Donnees, now = Date.now()): Eleve[] {
  const delai = Math.max(1, d.reglages.relanceJours) * 86_400_000;
  return elevesPaiementEnAttente(d).filter((e) => destinataires(e).length > 0 && (!e.dernierRappel || now - e.dernierRappel >= delai));
}

/** Ouverture de l'appel : 30 min avant le début de la séance. */
export function etatAppel(s: SeanceProgrammee, now = Date.now()): { ouvert: boolean; ouverture: number; debut: number } {
  const ouverture = s.debut - 30 * 60_000;
  return { ouvert: now >= ouverture, ouverture, debut: s.debut };
}

// ---------- Chevauchements de séances ----------
const enMinutes = (h: string) => { const [a, b] = h.split(":").map(Number); return (a || 0) * 60 + (b || 0); };
const seChevauchent = (d1: string, f1: string, d2: string, f2: string) => enMinutes(d1) < enMinutes(f2) && enMinutes(d2) < enMinutes(f1);

/** Autre groupe dont le créneau hebdomadaire chevauche celui-ci (même jour, horaires qui se croisent). */
export function chevauchementCreneau(d: Donnees, c: { jourSemaine: string; heureDebut: string; heureFin: string }, exclureId?: string): Groupe | null {
  return d.groupes.find((g) => g.id !== exclureId
    && g.jourSemaine.toLowerCase() === c.jourSemaine.toLowerCase()
    && seChevauchent(c.heureDebut, c.heureFin, g.heureDebut, g.heureFin)) ?? null;
}

/** Séance déjà programmée ce jour-là qui chevaucherait un nouveau créneau (report). */
export function chevauchementLe(d: Donnees, jour: number, heureDebut: string, heureFin: string, groupeId: string, origine: number): SeanceProgrammee | null {
  return seancesDuJour(d, jour).find((s) => !s.annulee
    && !(s.groupe.id === groupeId && (s.reportDe === origine || s.jour === origine))
    && seChevauchent(heureDebut, heureFin, s.heureDebut, s.heureFin)) ?? null;
}

/** Heure de fin d'une séance reportée (même durée que le créneau du groupe). */
export const finApres = (g: Groupe, heureDebut: string) => ajouterMinutes(heureDebut, dureeMinutes(g));

// ---------- Tarifs ----------
/** Prix d'une séance pour un élève : tarif de son groupe (ou général), moins sa réduction. */
export function prixSeance(d: Donnees, e: Eleve): number {
  const g = d.groupes.find((x) => x.nom.trim().toLowerCase() === e.groupe.trim().toLowerCase());
  const base = g?.tarifSeance ?? d.reglages.tarifForfait / Math.max(1, d.reglages.seancesParPaiement);
  return Math.round(base * (1 - Math.min(100, Math.max(0, e.remise ?? 0)) / 100) * 100) / 100;
}

// ---------- Contacts ----------
/** Numéros à qui envoyer un message pour cet élève (élève, parent ou les deux). */
export function destinataires(e: Eleve): { libelle: string; telephone: string }[] {
  const choix = e.contactMessages ?? (e.telephoneParent ? "parent" : "eleve");
  const res: { libelle: string; telephone: string }[] = [];
  if ((choix === "eleve" || choix === "les_deux") && e.telephone.trim()) res.push({ libelle: "Élève", telephone: e.telephone });
  if ((choix === "parent" || choix === "les_deux") && e.telephoneParent?.trim()) res.push({ libelle: e.nomParent?.trim() || "Parent", telephone: e.telephoneParent });
  if (!res.length && e.telephone.trim()) res.push({ libelle: "Élève", telephone: e.telephone });
  if (!res.length && e.telephoneParent?.trim()) res.push({ libelle: "Parent", telephone: e.telephoneParent });
  return res;
}

// ---------- Absences ----------
/** Nombre d'absences non justifiées consécutives (séances les plus récentes). */
export function absencesConsecutives(d: Donnees, e: Eleve): { nb: number; derniere: number } {
  const liste = d.seances.filter((s) => s.eleveId === e.id).sort((a, b) => b.date - a.date);
  let nb = 0;
  for (const s of liste) { if (s.statut === "A") nb++; else if (s.statut !== "J") break; }
  return { nb, derniere: liste[0]?.date ?? 0 };
}

/** Élèves à signaler : au moins N absences de suite, alerte pas encore traitée. */
export function alertesAbsences(d: Donnees): { eleve: Eleve; nb: number }[] {
  const seuil = Math.max(1, d.reglages.seuilAbsences);
  return d.eleves
    .map((e) => ({ eleve: e, ...absencesConsecutives(d, e) }))
    .filter((x) => x.nb >= seuil && x.derniere > (x.eleve.alerteAbsenceVue ?? 0))
    .map(({ eleve, nb }) => ({ eleve, nb }));
}

// ---------- Rattrapages ----------
export function rattrapagesDuJour(d: Donnees, jour = Date.now()): Rattrapage[] {
  const j = debutDuJour(jour);
  return d.rattrapages.filter((r) => debutDuJour(r.debut) === j).sort((a, b) => a.debut - b.debut);
}

/** Groupe ou rattrapage qui occupe déjà ce créneau ce jour-là. */
export function creneauOccupe(d: Donnees, jour: number, heureDebut: string, heureFin: string, exclureRattrapage?: string): string | null {
  const s = seancesDuJour(d, jour).find((x) => !x.annulee && seChevauchent(heureDebut, heureFin, x.heureDebut, x.heureFin));
  if (s) return `le groupe ${s.groupe.nom} (${s.heureDebut}–${s.heureFin})`;
  const r = rattrapagesDuJour(d, jour).find((x) => x.id !== exclureRattrapage && seChevauchent(heureDebut, heureFin, x.heureDebut, x.heureFin));
  if (r) { const e = d.eleves.find((x) => x.id === r.eleveId); return `le rattrapage de ${e ? e.prenom : "un élève"} (${r.heureDebut}–${r.heureFin})`; }
  return null;
}

// ---------- Capacité ----------
export function placesDuGroupe(d: Donnees, g: Groupe): { inscrits: number; capacite?: number; restantes: number; complet: boolean } {
  const inscrits = d.eleves.filter((e) => e.groupe.trim().toLowerCase() === g.nom.trim().toLowerCase()).length;
  const capacite = g.capacite && g.capacite > 0 ? g.capacite : undefined;
  const restantes = capacite ? Math.max(0, capacite - inscrits) : Infinity;
  return { inscrits, capacite, restantes, complet: capacite !== undefined && inscrits >= capacite };
}
