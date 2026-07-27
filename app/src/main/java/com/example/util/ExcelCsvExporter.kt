package com.example.util

import android.content.Context
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.PaiementEntity
import com.example.data.local.entity.SeanceEntity
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object ExcelCsvExporter {

    fun exportElevesToCsv(context: Context, eleves: List<EleveEntity>): File? {
        val sb = StringBuilder()
        sb.append("ID;Nom;Prénom;Téléphone;Classe;Groupe;Date Inscription;Séances Cycle;Total Séances;Observation\n")
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)

        for (e in eleves) {
            val dateStr = sdf.format(Date(e.dateInscriptionEpochMs))
            sb.append("${e.id};\"${e.nom}\";\"${e.prenom}\";\"${e.telephone}\";\"${e.classe}\";\"${e.groupe ?: ""}\";\"$dateStr\";${e.sessionsInCurrentCycle};${e.totalSeancesRealisees};\"${e.observation}\"\n")
        }

        val dir = File(context.cacheDir, "csv")
        if (!dir.exists()) dir.mkdirs()
        val file = File(dir, "Export_Eleves.csv")

        return try {
            val fos = FileOutputStream(file)
            fos.write(sb.toString().toByteArray(Charsets.UTF_8))
            fos.close()
            file
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun exportSeancesToCsv(context: Context, seances: List<SeanceEntity>): File? {
        val sb = StringBuilder()
        sb.append("ID;ID Élève;Nom Élève;Date;Heure;Durée (h);Statut;Commentaire\n")
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)

        for (s in seances) {
            val dateStr = sdf.format(Date(s.dateEpochMs))
            val statutStr = when(s.statut) {
                "P" -> "Présent"
                "A" -> "Absent"
                "R" -> "Retard"
                else -> s.statut
            }
            sb.append("${s.id};${s.eleveId};\"${s.nomEleveCache}\";\"$dateStr\";\"${s.heure}\";${s.dureeHeures};\"$statutStr\";\"${s.commentaire}\"\n")
        }

        val dir = File(context.cacheDir, "csv")
        if (!dir.exists()) dir.mkdirs()
        val file = File(dir, "Export_Seances.csv")

        return try {
            val fos = FileOutputStream(file)
            fos.write(sb.toString().toByteArray(Charsets.UTF_8))
            fos.close()
            file
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun exportPaiementsToCsv(context: Context, paiements: List<PaiementEntity>, devise: String = "TND"): File? {
        val sb = StringBuilder()
        sb.append("ID;ID Élève;Nom Élève;Date;Montant ($devise);Mode Paiement;Nb Séances Réglées;Observation\n")
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)

        for (p in paiements) {
            val dateStr = sdf.format(Date(p.dateEpochMs))
            sb.append("${p.id};${p.eleveId};\"${p.nomEleveCache}\";\"$dateStr\";${p.montant};\"${p.modePaiement}\";${p.nbSeancesReglees};\"${p.observation}\"\n")
        }

        val dir = File(context.cacheDir, "csv")
        if (!dir.exists()) dir.mkdirs()
        val file = File(dir, "Export_Paiements.csv")

        return try {
            val fos = FileOutputStream(file)
            fos.write(sb.toString().toByteArray(Charsets.UTF_8))
            fos.close()
            file
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
