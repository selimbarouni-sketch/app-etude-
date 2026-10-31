package com.example.util

import android.content.Context
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.PaiementEntity
import com.example.data.local.entity.SeanceEntity
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ExcelCsvExporter {

    // BOM UTF-8 : sans lui, Excel affiche mal les accents (é, è, à…)
    private const val BOM = "﻿"

    /** Échappe une valeur CSV (guillemets, points-virgules, retours à la ligne). */
    private fun c(value: Any?): String {
        val s = value?.toString() ?: ""
        return "\"" + s.replace("\"", "\"\"") + "\""
    }

    private fun ligne(vararg values: Any?): String = values.joinToString(";") { c(it) } + "\r\n"

    private fun ecrire(context: Context, nomFichier: String, contenu: String): File? {
        val dir = File(context.cacheDir, "csv")
        if (!dir.exists()) dir.mkdirs()
        val file = File(dir, nomFichier)
        return try {
            file.writeText(BOM + contenu, Charsets.UTF_8)
            file
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun exportElevesToCsv(context: Context, eleves: List<EleveEntity>): File? {
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)
        val sb = StringBuilder()
        sb.append(ligne("ID", "Nom", "Prénom", "Téléphone", "Classe", "Groupe", "Date Inscription", "Séances Cycle", "Total Séances", "Observation"))
        for (e in eleves) {
            sb.append(ligne(e.id, e.nom, e.prenom, e.telephone, e.classe, e.groupe ?: "", sdf.format(Date(e.dateInscriptionEpochMs)), e.sessionsInCurrentCycle, e.totalSeancesRealisees, e.observation))
        }
        return ecrire(context, "Export_Eleves.csv", sb.toString())
    }

    fun exportSeancesToCsv(context: Context, seances: List<SeanceEntity>): File? {
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)
        val sb = StringBuilder()
        sb.append(ligne("ID", "ID Élève", "Nom Élève", "Groupe", "Date", "Heure", "Durée (h)", "Statut", "Commentaire"))
        for (s in seances) {
            val statutStr = when (s.statut) {
                "P" -> "Présent"
                "A" -> "Absent"
                "R" -> "Retard"
                else -> s.statut
            }
            sb.append(ligne(s.id, s.eleveId, s.nomEleveCache, s.groupeCache, sdf.format(Date(s.dateEpochMs)), s.heure, formatDuree(s.dureeHeures), statutStr, s.commentaire))
        }
        return ecrire(context, "Export_Seances.csv", sb.toString())
    }

    fun exportPaiementsToCsv(context: Context, paiements: List<PaiementEntity>, devise: String = "TND"): File? {
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)
        val sb = StringBuilder()
        sb.append(ligne("ID", "ID Élève", "Nom Élève", "Date", "Montant ($devise)", "Mode Paiement", "Nb Séances Réglées", "Observation"))
        for (p in paiements) {
            sb.append(ligne(p.id, p.eleveId, p.nomEleveCache, sdf.format(Date(p.dateEpochMs)), formatMontant(p.montant), p.modePaiement, p.nbSeancesReglees, p.observation))
        }
        return ecrire(context, "Export_Paiements.csv", sb.toString())
    }
}
