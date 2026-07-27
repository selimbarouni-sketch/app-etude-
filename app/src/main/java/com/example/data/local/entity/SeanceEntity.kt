package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "seances")
data class SeanceEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val eleveId: Int,
    val dateEpochMs: Long = System.currentTimeMillis(),
    val heure: String,
    val dureeHeures: Float = 2.0f,
    val statut: String, // "P" (Présent), "A" (Absent), "R" (Retard)
    val commentaire: String = "",
    val nomEleveCache: String = "",
    val groupeCache: String = ""
)
