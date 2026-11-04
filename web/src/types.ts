/** P présent, A absent, R retard, J absence justifiée (jamais comptée) */
export type Statut = "P" | "A" | "R" | "J";

export interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  classe: string;
  groupe: string;
  anniversaire: string;
  observation: string;
  dateInscription: number;
  sessionsInCurrentCycle: number;
  totalSeancesRealisees: number;
  /** Date du dernier rappel de paiement envoyé (WhatsApp/SMS) */
  dernierRappel?: number;
  nomParent?: string;
  telephoneParent?: string;
  /** À qui envoyer les messages (rappels, reçus, annulations) */
  contactMessages?: "eleve" | "parent" | "les_deux";
  /** Réduction en % sur le tarif du groupe (ex. frères et sœurs) */
  remise?: number;
  /** Alerte d'absences déjà traitée jusqu'à cette date */
  alerteAbsenceVue?: number;
}

/** Séance d'un groupe annulée ou reportée (par rapport à son créneau hebdomadaire). */
export interface ExceptionSeance {
  id: string;
  /** Jour de la séance d'origine (minuit) */
  date: number;
  type: "annulee" | "reportee";
  /** Pour un report : nouveau jour (minuit) et nouvelle heure */
  nouvelleDate?: number;
  nouvelleHeure?: string;
  motif: string;
}

export interface Groupe {
  id: string;
  nom: string;
  jourSemaine: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  remarque: string;
  prochaineSeance: number;
  exceptions?: ExceptionSeance[];
  /** Tarif d'une séance pour ce groupe (sinon tarif général) */
  tarifSeance?: number;
}

/** Période sans cours (vacances, jour férié) : toutes les séances sont annulées. */
export interface Vacances {
  id: string;
  debut: number; // minuit du premier jour
  fin: number; // minuit du dernier jour
  motif: string;
}

export interface RendezVous {
  id: string;
  eleveId: string | null;
  nomEleve: string;
  date: number; // instant de début (date + heure)
  heure: string;
  dureeHeures: number;
  lieu: string;
  remarque: string;
  /** Séance annulée : reste visible (barrée), sans rappel */
  annule?: boolean;
}

export interface Seance {
  id: string;
  eleveId: string;
  date: number;
  heure: string;
  dureeHeures: number;
  statut: Statut;
  commentaire: string;
  nomEleve: string;
  groupe: string;
}

export interface Paiement {
  id: string;
  eleveId: string;
  nomEleve: string;
  date: number;
  montant: number;
  modePaiement: string;
  nbSeancesReglees: number;
  observation: string;
  /** Groupe de l'élève au moment du paiement (historique par groupe) */
  groupe?: string;
  /** false = prévu mais pas encore encaissé (ex. chèque à déposer). Absent = encaissé. */
  encaisse?: boolean;
}

export interface Dossier {
  id: string;
  nom: string;
}

export interface Note {
  id: string;
  dossierId: string | null;
  titre: string;
  contenu: string;
  date: number;
  estFavori: boolean;
}

export type Theme = "auto" | "clair" | "sombre";
export type Style = "classique" | "chic";

/** Personnalisation : nom affiché, sous-titre, couleur principale, logo (image en data URL). */
export interface Marque {
  nom?: string;
  slogan?: string;
  couleur?: string;
  logo?: string;
}

export interface Reglages {
  seancesParPaiement: number;
  tarifForfait: number;
  dureeParDefautHeures: number;
  devise: string;
  theme: Theme;
  style: Style;
  smsTemplateRappel: string;
  smsTemplatePaiement: string;
  /** Relancer un élève qui n'a pas payé tous les N jours */
  relanceJours: number;
  /** Les absences non justifiées sont dues (comptées comme séances) */
  absencesComptees: boolean;
  /** Alerte après N absences de suite */
  seuilAbsences: number;
  smsTemplateAbsence: string;
  marque?: Marque;
}

export interface Donnees {
  version: 1;
  eleves: Eleve[];
  groupes: Groupe[];
  rendezVous: RendezVous[];
  seances: Seance[];
  paiements: Paiement[];
  dossiers: Dossier[];
  notes: Note[];
  vacances: Vacances[];
  reglages: Reglages;
}
