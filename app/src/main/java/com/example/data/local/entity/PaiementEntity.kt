package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "paiements")
data class PaiementEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val eleveId: Int,
    val nomEleveCache: String,
    val dateEpochMs: Long = System.currentTimeMillis(),
    val montant: Double, // Amount in TND (Dinar Tunisien)
    val modePaiement: String = "Espèces", // "Espèces", "Virement", "Carte", "Chèque"
    val nbSeancesReglees: Int = 4,
    val observation: String = ""
)
