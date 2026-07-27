package com.example.util

import android.content.Context
import android.widget.Toast
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

object DatabaseBackupHelper {

    fun exportDatabase(context: Context): File? {
        val dbFile = context.getDatabasePath("prof_suivi_db")
        if (!dbFile.exists()) {
            Toast.makeText(context, "Base de données introuvable", Toast.LENGTH_SHORT).show()
            return null
        }

        val backupDir = File(context.getExternalFilesDir(null), "backups")
        if (!backupDir.exists()) backupDir.mkdirs()

        val backupFile = File(backupDir, "prof_suivi_backup_${System.currentTimeMillis()}.sqlite")

        return try {
            val src = FileInputStream(dbFile).channel
            val dst = FileOutputStream(backupFile).channel
            dst.transferFrom(src, 0, src.size())
            src.close()
            dst.close()
            backupFile
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun importDatabase(context: Context, backupFile: File): Boolean {
        val dbFile = context.getDatabasePath("prof_suivi_db")
        return try {
            val src = FileInputStream(backupFile).channel
            val dst = FileOutputStream(dbFile).channel
            dst.transferFrom(src, 0, src.size())
            src.close()
            dst.close()
            true
        } catch (e: Exception) {
            e.printStackTrace()
            false
        }
    }
}
