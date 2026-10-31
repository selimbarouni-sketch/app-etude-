package com.example.util

import java.util.Locale

/** 100.0 -> "100", 12.5 -> "12,50" */
fun formatMontant(montant: Double): String =
    if (montant % 1.0 == 0.0) String.format(Locale.FRANCE, "%.0f", montant)
    else String.format(Locale.FRANCE, "%.2f", montant)

/** 2.0 -> "2", 1.5 -> "1,5" */
fun formatDuree(heures: Float): String =
    if (heures % 1f == 0f) heures.toInt().toString()
    else String.format(Locale.FRANCE, "%.1f", heures)

/** Remplace les mots-clés d'un modèle de message. */
fun remplirModele(
    modele: String,
    prenom: String,
    nom: String,
    classe: String,
    heure: String,
    montant: String = "",
    devise: String = ""
): String = modele
    .replace("{prenom}", prenom)
    .replace("{nom}", nom)
    .replace("{classe}", classe)
    .replace("{heure}", heure)
    .replace("{montant}", montant)
    .replace("{devise}", devise)

/** "3/4" ou, si des séances ont été payées d'avance, "Crédit 2". */
fun libelleCycle(seancesDues: Int, limite: Int): String =
    if (seancesDues < 0) "Crédit ${-seancesDues}" else "$seancesDues/$limite"
