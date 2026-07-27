package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "eleves")
data class EleveEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val nom: String,
    val prenom: String,
    val telephone: String,
    val classe: String, // e.g. "Terminal", "3ème", "Bac Math"
    val dateInscriptionEpochMs: Long = System.currentTimeMillis(),
    val observation: String = "",
    val photoUri: String? = null,
    val groupe: String? = null, // e.g. "Groupe A", "Maths Bac"
    val anniversaire: String? = null, // e.g. "15/08"
    val sessionsInCurrentCycle: Int = 0, // Unpaid sessions in current 4-session cycle
    val totalSeancesRealisees: Int = 0,
    val isArchived: Boolean = false
)
