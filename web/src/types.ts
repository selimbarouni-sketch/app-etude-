export type Statut = "P" | "A" | "R";

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

export interface Reglages {
  seancesParPaiement: number;
  tarifForfait: number;
  dureeParDefautHeures: number;
  devise: string;
  theme: Theme;
  smsTemplateRappel: string;
  smsTemplatePaiement: string;
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
  reglages: Reglages;
}
