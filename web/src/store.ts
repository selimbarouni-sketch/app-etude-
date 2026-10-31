import { useSyncExternalStore } from "react";
import { CONFIG } from "./config";
import type { Donnees, Eleve, Groupe, Note, Paiement, Reglages, RendezVous, Seance, Statut } from "./types";
import { combinerDateHeure, dureeEntre, prochainCreneau, uid } from "./utils";

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
  smsTemplatePaiement: "Bonjour {prenom}, rappel pour le paiement du forfait ({montant} {devise}). Merci !",
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

function maj(f: (d: Donnees) => Donnees) {
  etat = f(etat);
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
    erreurSauvegarde = false;
  } catch {
    erreurSauvegarde = true;
  }
  abonnes.forEach((cb) => cb());
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

const compte = (s: Statut) => s === "P" || s === "R";

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
  /** Ajoute la prochaine séance hebdomadaire du groupe à l'agenda. Renvoie sa date. */
  programmerProchaineSeance(groupe: Groupe): { date: number; dejaPresent: boolean } {
    const date = prochainCreneau(groupe.jourSemaine, groupe.heureDebut);
    const nom = `Groupe : ${groupe.nom}`;
    const dejaPresent = etat.rendezVous.some((r) => r.nomEleve === nom && r.date === date && !r.annule);
    if (!dejaPresent) {
      const rdv: RendezVous = {
        id: uid(),
        eleveId: null,
        nomEleve: nom,
        date,
        heure: groupe.heureDebut,
        dureeHeures: dureeEntre(groupe.heureDebut, groupe.heureFin) ?? etat.reglages.dureeParDefautHeures,
        lieu: groupe.lieu,
        remarque: `Séance hebdomadaire (${groupe.jourSemaine} ${groupe.heureDebut}-${groupe.heureFin})`,
      };
      maj((d) => ({
        ...d,
        rendezVous: [...d.rendezVous, rdv],
        groupes: d.groupes.map((g) => (g.id === groupe.id ? { ...g, prochaineSeance: date } : g)),
      }));
    }
    return { date, dejaPresent };
  },

  // ---------- Rendez-vous ----------
  ajouterRendezVous(r: Omit<RendezVous, "id" | "date"> & { jour: number }) {
    const { jour, ...reste } = r;
    maj((d) => ({ ...d, rendezVous: [...d.rendezVous, { ...reste, id: uid(), date: combinerDateHeure(jour, r.heure) }] }));
  },
  /** Reporte une séance à une nouvelle date/heure (et la rétablit si elle était annulée). */
  reporterRendezVous(id: string, jour: number, heure: string) {
    maj((d) => ({ ...d, rendezVous: d.rendezVous.map((r) => (r.id === id ? { ...r, date: combinerDateHeure(jour, heure), heure, annule: false } : r)) }));
  },
  annulerRendezVous(id: string, annule: boolean) {
    maj((d) => ({ ...d, rendezVous: d.rendezVous.map((r) => (r.id === id ? { ...r, annule } : r)) }));
  },
  supprimerRendezVous(id: string) {
    maj((d) => ({ ...d, rendezVous: d.rendezVous.filter((x) => x.id !== id) }));
  },

  // ---------- Séances ----------
  enregistrerAppel(seances: Omit<Seance, "id">[]) {
    maj((d) => {
      const parEleve = new Map<string, number>();
      seances.forEach((s) => compte(s.statut) && parEleve.set(s.eleveId, (parEleve.get(s.eleveId) ?? 0) + 1));
      return {
        ...d,
        seances: [...seances.map((s) => ({ ...s, id: uid() })), ...d.seances],
        eleves: d.eleves.map((e) => {
          const n = parEleve.get(e.id) ?? 0;
          return n ? { ...e, sessionsInCurrentCycle: e.sessionsInCurrentCycle + n, totalSeancesRealisees: e.totalSeancesRealisees + n } : e;
        }),
      };
    });
  },
  supprimerSeance(id: string) {
    maj((d) => {
      const s = d.seances.find((x) => x.id === id);
      if (!s) return d;
      return {
        ...d,
        seances: d.seances.filter((x) => x.id !== id),
        eleves: compte(s.statut)
          ? d.eleves.map((e) =>
              e.id === s.eleveId
                ? { ...e, sessionsInCurrentCycle: e.sessionsInCurrentCycle - 1, totalSeancesRealisees: Math.max(0, e.totalSeancesRealisees - 1) }
                : e
            )
          : d.eleves,
      };
    });
  },

  // ---------- Paiements ----------
  enregistrerPaiement(p: { eleve: Eleve; montant: number; modePaiement: string; nbSeances: number; observation: string; encaisse?: boolean }) {
    maj((d) => ({
      ...d,
      paiements: [
        {
          id: uid(),
          eleveId: p.eleve.id,
          nomEleve: `${p.eleve.prenom} ${p.eleve.nom}`,
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
      eleves: d.eleves.map((e) => (e.id === p.eleve.id ? { ...e, sessionsInCurrentCycle: e.sessionsInCurrentCycle - p.nbSeances } : e)),
    }));
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
  const now = Date.now();
  const rdv = d.rendezVous
    .filter((r) => !r.annule && r.date >= now && (r.eleveId === e.id || (e.groupe && r.nomEleve === `Groupe : ${e.groupe}`)))
    .sort((a, b) => a.date - b.date)[0];
  if (rdv) return rdv.heure;
  const g = d.groupes.find((x) => x.nom.toLowerCase() === e.groupe.toLowerCase());
  return g?.heureDebut ?? "l'heure prévue";
}
