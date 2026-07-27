package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "dossiers_notes")
data class DossierNoteEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val nom: String
)

@Entity(tableName = "notes")
data class NoteEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val dossierId: Int? = null,
    val titre: String,
    val contenu: String,
    val dateEpochMs: Long = System.currentTimeMillis(),
    val estFavori: Boolean = false
)
