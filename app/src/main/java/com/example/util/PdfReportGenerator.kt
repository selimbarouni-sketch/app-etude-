package com.example.util

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.PaiementEntity
import com.example.data.local.entity.SeanceEntity
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object PdfReportGenerator {

    fun generateEleveRapportPdf(
        context: Context,
        eleve: EleveEntity,
        seances: List<SeanceEntity>,
        paiements: List<PaiementEntity>,
        devise: String = "TND"
    ): File? {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas

        val paintTitle = Paint().apply {
            color = Color.rgb(21, 101, 192) // Primary Blue
            textSize = 22f
            isFakeBoldText = true
        }

        val paintSubTitle = Paint().apply {
            color = Color.rgb(33, 33, 33)
            textSize = 14f
            isFakeBoldText = true
        }

        val paintText = Paint().apply {
            color = Color.rgb(66, 66, 66)
            textSize = 12f
        }

        val paintHeader = Paint().apply {
            color = Color.rgb(21, 101, 192)
            textSize = 12f
            isFakeBoldText = true
        }

        val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)

        var y = 50f
        canvas.drawText("ProfSuivi - Rapport Élève", 40f, y, paintTitle)
        y += 20f
        paintText.textSize = 10f
        canvas.drawText("Généré le ${dateFormat.format(Date())}", 40f, y, paintText)
        y += 30f

        // Eleve Info Box
        paintSubTitle.textSize = 16f
        canvas.drawText("Fiche Élève : ${eleve.prenom} ${eleve.nom}", 40f, y, paintSubTitle)
        y += 20f
        paintText.textSize = 12f
        canvas.drawText("Classe / Groupe : ${eleve.classe} ${if (!eleve.groupe.isNull_or_empty()) "(${eleve.groupe})" else ""}", 40f, y, paintText)
        y += 18f
        canvas.drawText("Téléphone : ${eleve.telephone}", 40f, y, paintText)
        y += 18f
        canvas.drawText("Séances cycle actuel : ${eleve.sessionsInCurrentCycle} / 4", 40f, y, paintText)
        y += 18f
        canvas.drawText("Total séances réalisées : ${eleve.totalSeancesRealisees}", 40f, y, paintText)
        y += 30f

        // Seances Table
        canvas.drawText("Historique des Séances (${seances.size})", 40f, y, paintSubTitle)
        y += 20f
        canvas.drawText("Date", 40f, y, paintHeader)
        canvas.drawText("Heure / Durée", 150f, y, paintHeader)
        canvas.drawText("Statut", 300f, y, paintHeader)
        canvas.drawText("Commentaire", 400f, y, paintHeader)
        y += 10f
        canvas.drawLine(40f, y, 555f, y, paintHeader)
        y += 18f

        val pCount = seances.count { it.statut == "P" }
        val aCount = seances.count { it.statut == "A" }
        val rCount = seances.count { it.statut == "R" }

        for (s in seances.take(15)) {
            val dateStr = dateFormat.format(Date(s.dateEpochMs))
            val statusStr = when (s.statut) {
                "P" -> "Présent (P)"
                "A" -> "Absent (A)"
                "R" -> "Retard (R)"
                else -> s.statut
            }
            canvas.drawText(dateStr, 40f, y, paintText)
            canvas.drawText("${s.heure} (${s.dureeHeures}h)", 150f, y, paintText)
            canvas.drawText(statusStr, 300f, y, paintText)
            canvas.drawText(s.commentaire.take(20), 400f, y, paintText)
            y += 18f
            if (y > 750f) break
        }

        y += 15f
        canvas.drawText("Statistiques Présence: $pCount Présent(s), $aCount Absent(s), $rCount Retard(s)", 40f, y, paintSubTitle)
        y += 30f

        // Paiements Summary
        canvas.drawText("Historique des Paiements (${paiements.size})", 40f, y, paintSubTitle)
        y += 20f
        val totalPaye = paiements.sumOf { it.montant }
        canvas.drawText("Date", 40f, y, paintHeader)
        canvas.drawText("Montant", 180f, y, paintHeader)
        canvas.drawText("Mode", 300f, y, paintHeader)
        canvas.drawText("Observation", 400f, y, paintHeader)
        y += 10f
        canvas.drawLine(40f, y, 555f, y, paintHeader)
        y += 18f

        for (p in paiements.take(8)) {
            canvas.drawText(dateFormat.format(Date(p.dateEpochMs)), 40f, y, paintText)
            canvas.drawText("${p.montant} $devise", 180f, y, paintText)
            canvas.drawText(p.modePaiement, 300f, y, paintText)
            canvas.drawText(p.observation.take(20), 400f, y, paintText)
            y += 18f
        }

        y += 15f
        canvas.drawText("Total encaissé pour cet élève : $totalPaye $devise", 40f, y, paintSubTitle)

        pdfDocument.finishPage(page)

        val dir = File(context.cacheDir, "reports")
        if (!dir.exists()) dir.mkdirs()
        val file = File(dir, "Rapport_${eleve.nom}_${eleve.prenom}.pdf")

        return try {
            val fos = FileOutputStream(file)
            pdfDocument.writeTo(fos)
            pdfDocument.close()
            fos.close()
            file
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()
}
