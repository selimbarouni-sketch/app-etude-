package com.example.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "rendez_vous")
data class RendezVousEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val eleveId: Int? = null,
    val nomEleve: String, // Nom de l'élève ou du groupe
    val dateEpochMs: Long,
    val heure: String, // e.g. "16:00"
    val dureeHeures: Float = 2.0f, // Default 2 hours
    val lieu: String = "À domicile",
    val remarque: String = "",
    val estEffectue: Boolean = false,
    /** Séance annulée : conservée dans l'agenda (barrée), sans rappel. */
    @ColumnInfo(defaultValue = "0")
    val estAnnule: Boolean = false
)
