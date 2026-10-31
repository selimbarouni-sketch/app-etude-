/**
 * PERSONNALISATION — modifiez ces valeurs pour adapter l'application.
 * (nom, slogan, couleurs, devise, indicatif téléphonique)
 */
export const CONFIG = {
  nomApp: "ProfSuivi",
  slogan: "Gestion de cours particuliers",
  /** Couleur principale du style « Classique » (boutons, liens, menu actif) */
  couleurPrincipale: "#1565C0",
  /** Couleur principale en mode sombre (plus claire pour rester lisible) */
  couleurPrincipaleSombre: "#90CAF9",
  /** Couleurs du style « Chic » (bleu nuit et or) */
  couleurChic: "#1F2A44",
  couleurChicSombre: "#C9A96E",
  deviseParDefaut: "TND",
  /** Indicatif ajouté aux numéros locaux à 8 chiffres pour WhatsApp */
  indicatifPays: "216",
  /** Exemples de groupes créés au premier lancement */
  groupesExemple: [
    { nom: "Groupe Bac Math", jourSemaine: "Samedi", heureDebut: "14:00", heureFin: "16:00", lieu: "Salle 1" },
    { nom: "Groupe 3ème A", jourSemaine: "Mercredi", heureDebut: "15:00", heureFin: "17:00", lieu: "Salle 2" },
  ],
};
