package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "settings")
data class SettingsEntity(
    @PrimaryKey
    val id: Int = 1,
    val seancesParPaiement: Int = 4,
    val tarifParSeance: Double = 25.0,
    val tarifForfait: Double = 100.0,
    val dureeParDefautHeures: Float = 2.0f, // 2 hours by default
    val devise: String = "TND", // Dinar Tunisien
    val modeSombre: Boolean = false,
    val smsTemplateRappel: String = "Bonjour {prenom}, petit rappel concernant votre cours de {classe} aujourd'hui à {heure}. Merci!",
    val smsTemplatePaiement: String = "Bonjour {prenom}, rappel pour le paiement du forfait de 4 séances ({montant} {devise}). Merci!"
)
