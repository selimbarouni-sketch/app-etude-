package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "groupes")
data class GroupeEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val nom: String, // e.g. "Groupe Bac Math", "Groupe 3ème A"
    val jourSemaine: String = "Samedi", // Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi, Dimanche
    val heureDebut: String = "14:00", // e.g. "14:00"
    val heureFin: String = "16:00", // e.g. "16:00"
    val lieu: String = "Salle Principale / À domicile",
    val remarque: String = "",
    val prochaineSeanceEpochMs: Long = 0L // Scheduled next session epoch ms
)
