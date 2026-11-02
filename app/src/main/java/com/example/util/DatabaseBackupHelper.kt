package com.example.util

import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.net.Uri
import android.widget.Toast
import com.example.data.local.AppDatabase
import java.io.File

/**
 * Sauvegarde et restauration de toutes les données (élèves, groupes, séances, paiements, notes, réglages).
 */
object DatabaseBackupHelper {

    /** Écrit toutes les dernières modifications dans le fichier principal de la base (mode WAL). */
    private fun checkpoint(context: Context) {
        AppDatabase.getInstance(context).openHelper.writableDatabase
            .query("PRAGMA wal_checkpoint(FULL)").use { it.moveToFirst() }
    }

    /** Copie de la base dans un fichier temporaire (pour la partager). */
    fun exportDatabase(context: Context): File? {
        val dbFile = context.getDatabasePath(AppDatabase.DB_NAME)
        if (!dbFile.exists()) {
            Toast.makeText(context, "Base de données introuvable", Toast.LENGTH_SHORT).show()
            return null
        }
        return try {
            checkpoint(context)
            val backupDir = File(context.getExternalFilesDir(null) ?: context.cacheDir, "backups")
            if (!backupDir.exists()) backupDir.mkdirs()
            val backupFile = File(backupDir, "ProfSuivi_sauvegarde_${System.currentTimeMillis()}.sqlite")
            dbFile.copyTo(backupFile, overwrite = true)
            backupFile
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /** Enregistre la sauvegarde à l'endroit choisi par l'utilisateur (Téléchargements, Drive…). */
    fun enregistrerVers(context: Context, destination: Uri): Boolean = try {
        checkpoint(context)
        val dbFile = context.getDatabasePath(AppDatabase.DB_NAME)
        context.contentResolver.openOutputStream(destination, "w")?.use { out ->
            dbFile.inputStream().use { it.copyTo(out) }
        } ?: error("destination inaccessible")
        true
    } catch (e: Exception) {
        e.printStackTrace()
        false
    }

    /**
     * Restaure une sauvegarde : vérifie le fichier, remplace la base actuelle puis redémarre l'application.
     * Renvoie un message d'erreur, ou null si tout s'est bien passé (l'application redémarre alors).
     */
    fun restaurerDepuis(context: Context, source: Uri): String? {
        val temp = File(context.cacheDir, "restauration.sqlite")
        try {
            context.contentResolver.openInputStream(source)?.use { input ->
                temp.outputStream().use { input.copyTo(it) }
            } ?: return "Impossible de lire le fichier."

            // 1. Est-ce bien une base SQLite ProfSuivi ?
            val entete = temp.inputStream().use { ByteArray(16).also { b -> it.read(b) } }
            if (!String(entete, Charsets.US_ASCII).startsWith("SQLite format 3")) {
                return "Ce fichier n'est pas une sauvegarde ProfSuivi (.sqlite)."
            }
            SQLiteDatabase.openDatabase(temp.path, null, SQLiteDatabase.OPEN_READONLY).use { db ->
                db.rawQuery("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('eleves','paiements','seances')", null).use { c ->
                    if (c.count < 3) return "Ce fichier n'est pas une sauvegarde ProfSuivi."
                }
            }

            // 2. Remplacement de la base actuelle
            AppDatabase.fermer()
            val dbFile = context.getDatabasePath(AppDatabase.DB_NAME)
            File(dbFile.path + "-wal").delete()
            File(dbFile.path + "-shm").delete()
            temp.copyTo(dbFile, overwrite = true)
        } catch (e: Exception) {
            e.printStackTrace()
            return "Erreur pendant la restauration : ${e.message}"
        } finally {
            temp.delete()
        }

        // 3. Redémarrage de l'application pour recharger les données
        context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { intent ->
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            context.startActivity(intent)
        }
        Runtime.getRuntime().exit(0)
        return null
    }
}
