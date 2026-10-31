package com.example.util

import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.core.content.FileProvider
import java.io.File

/**
 * Les exports (CSV, PDF, sauvegarde) étaient écrits dans le dossier privé de l'app
 * et n'étaient donc jamais accessibles. On propose maintenant de les partager
 * (Drive, WhatsApp, e-mail, Fichiers…).
 */
object ShareHelper {

    fun partagerFichier(context: Context, file: File, mimeType: String, titre: String) {
        try {
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = mimeType
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, file.name)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(intent, titre))
        } catch (e: Exception) {
            Toast.makeText(context, "Impossible de partager le fichier", Toast.LENGTH_SHORT).show()
        }
    }
}
