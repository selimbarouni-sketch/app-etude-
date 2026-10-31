package com.example.util

import android.content.Context
import android.widget.Toast
import com.example.data.local.AppDatabase
import java.io.File

object DatabaseBackupHelper {

    /**
     * Copie la base SQLite dans un fichier de sauvegarde.
     * Correction : Room utilise le mode WAL ; sans "checkpoint", les dernières
     * modifications restaient dans le fichier -wal et n'étaient pas sauvegardées.
     */
    fun exportDatabase(context: Context): File? {
        val dbFile = context.getDatabasePath(AppDatabase.DB_NAME)
        if (!dbFile.exists()) {
            Toast.makeText(context, "Base de données introuvable", Toast.LENGTH_SHORT).show()
            return null
        }

        return try {
            AppDatabase.getInstance(context).openHelper.writableDatabase
                .query("PRAGMA wal_checkpoint(FULL)").use { it.moveToFirst() }

            val backupDir = File(context.getExternalFilesDir(null) ?: context.cacheDir, "backups")
            if (!backupDir.exists()) backupDir.mkdirs()
            val backupFile = File(backupDir, "prof_suivi_backup_${System.currentTimeMillis()}.sqlite")
            dbFile.copyTo(backupFile, overwrite = true)
            backupFile
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
