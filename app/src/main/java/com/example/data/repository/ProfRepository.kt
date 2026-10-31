package com.example.data.repository

import com.example.data.local.AppDatabase
import com.example.data.local.entity.DossierNoteEntity
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.GroupeEntity
import com.example.data.local.entity.NoteEntity
import com.example.data.local.entity.PaiementEntity
import com.example.data.local.entity.RendezVousEntity
import com.example.data.local.entity.SeanceEntity
import com.example.data.local.entity.SettingsEntity
import androidx.room.withTransaction
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map

class ProfRepository(private val db: AppDatabase) {

    private val eleveDao = db.eleveDao()
    private val groupeDao = db.groupeDao()
    private val rdvDao = db.rendezVousDao()
    private val seanceDao = db.seanceDao()
    private val paiementDao = db.paiementDao()
    private val noteDao = db.noteDao()
    private val settingsDao = db.settingsDao()

    // GROUPES
    val allGroupes: Flow<List<GroupeEntity>> = groupeDao.getAllGroupes()

    suspend fun addGroupe(groupe: GroupeEntity): Long = groupeDao.insertGroupe(groupe)

    suspend fun updateGroupe(groupe: GroupeEntity) = groupeDao.updateGroupe(groupe)

    suspend fun deleteGroupe(groupe: GroupeEntity) = groupeDao.deleteGroupe(groupe)

    suspend fun ensureDefaultGroupesExist() {
        if (groupeDao.getGroupeCount() == 0) {
            groupeDao.insertGroupe(GroupeEntity(nom = "Groupe Bac Math", jourSemaine = "Samedi", heureDebut = "14:00", heureFin = "16:00", lieu = "Salle 1"))
            groupeDao.insertGroupe(GroupeEntity(nom = "Groupe 3ème A", jourSemaine = "Mercredi", heureDebut = "15:00", heureFin = "17:00", lieu = "Salle 2"))
            groupeDao.insertGroupe(GroupeEntity(nom = "Groupe Terminale S", jourSemaine = "Dimanche", heureDebut = "10:00", heureFin = "12:00", lieu = "Centre"))
        }
    }

    // ELEVES
    val allEleves: Flow<List<EleveEntity>> = eleveDao.getAllEleves()

    fun getEleveById(id: Int): Flow<EleveEntity?> = eleveDao.getEleveById(id)

    suspend fun addEleve(eleve: EleveEntity): Long = eleveDao.insertEleve(eleve)

    suspend fun updateEleve(eleve: EleveEntity) = eleveDao.updateEleve(eleve)

    suspend fun deleteEleve(eleve: EleveEntity) = eleveDao.deleteEleve(eleve)

    // RENDEZ-VOUS
    val allRendezVous: Flow<List<RendezVousEntity>> = rdvDao.getAllRendezVous()


    suspend fun addRendezVous(rdv: RendezVousEntity): Long = rdvDao.insertRendezVous(rdv)

    suspend fun updateRendezVous(rdv: RendezVousEntity) = rdvDao.updateRendezVous(rdv)

    suspend fun deleteRendezVous(rdv: RendezVousEntity) = rdvDao.deleteRendezVous(rdv)

    // SEANCES & PRESENCES
    val allSeances: Flow<List<SeanceEntity>> = seanceDao.getAllSeances()

    fun getSeancesForEleve(eleveId: Int): Flow<List<SeanceEntity>> = seanceDao.getSeancesForEleve(eleveId)


    private fun estComptee(seance: SeanceEntity) = seance.statut == "P" || seance.statut == "R"

    suspend fun addSeanceAndIncrementCount(seance: SeanceEntity) {
        db.withTransaction {
            seanceDao.insertSeance(seance)
            if (estComptee(seance)) eleveDao.incrementSessionCount(seance.eleveId)
        }
    }

    suspend fun addBatchSeances(seances: List<SeanceEntity>) {
        db.withTransaction {
            seanceDao.insertSeances(seances)
            for (seance in seances) {
                if (estComptee(seance)) eleveDao.incrementSessionCount(seance.eleveId)
            }
        }
    }

    /** Correction : supprimer une séance ne décrémentait pas le compteur de l'élève. */
    suspend fun deleteSeance(seance: SeanceEntity) {
        db.withTransaction {
            seanceDao.deleteSeance(seance)
            if (estComptee(seance)) eleveDao.decrementSessionCount(seance.eleveId)
        }
    }

    // PAIEMENTS
    val allPaiements: Flow<List<PaiementEntity>> = paiementDao.getAllPaiements()

    fun getPaiementsForEleve(eleveId: Int): Flow<List<PaiementEntity>> = paiementDao.getPaiementsForEleve(eleveId)

    suspend fun marquerPaiementRecu(
        eleveId: Int,
        nomEleve: String,
        montant: Double,
        modePaiement: String,
        nbSeances: Int,
        observation: String
    ) {
        val paiement = PaiementEntity(
            eleveId = eleveId,
            nomEleveCache = nomEleve,
            dateEpochMs = System.currentTimeMillis(),
            montant = montant,
            modePaiement = modePaiement,
            nbSeancesReglees = nbSeances,
            observation = observation
        )
        db.withTransaction {
            paiementDao.insertPaiement(paiement)
            // Correction : on retire seulement les séances payées. Avant, le compteur
            // était remis à 0 et les séances en plus (ex. 6 faites, 4 payées) étaient perdues.
            eleveDao.deduireSeancesPayees(eleveId, nbSeances)
        }
    }

    // NOTES
    val allNotes: Flow<List<NoteEntity>> = noteDao.getAllNotes()
    val allDossiers: Flow<List<DossierNoteEntity>> = noteDao.getAllDossiers()

    fun getNotesByDossier(dossierId: Int): Flow<List<NoteEntity>> = noteDao.getNotesByDossier(dossierId)

    suspend fun addNote(note: NoteEntity): Long = noteDao.insertNote(note)

    suspend fun updateNote(note: NoteEntity) = noteDao.updateNote(note)

    suspend fun deleteNote(note: NoteEntity) = noteDao.deleteNote(note)

    suspend fun addDossier(nom: String): Long = noteDao.insertDossier(DossierNoteEntity(nom = nom))

    suspend fun deleteDossier(dossier: DossierNoteEntity) {
        db.withTransaction {
            noteDao.detacherNotesDuDossier(dossier.id)
            noteDao.deleteDossier(dossier)
        }
    }

    // SETTINGS
    val settingsFlow: Flow<SettingsEntity> = settingsDao.getSettings().map {
        it ?: SettingsEntity()
    }

    fun getSettingsOrDefault(): Flow<SettingsEntity> = settingsFlow

    suspend fun saveSettings(settings: SettingsEntity) = settingsDao.saveSettings(settings)

    // Pending payment list combining settings and eleves
    val elevesPaiementEnAttente: Flow<List<Pair<EleveEntity, Int>>> = combine(allEleves, settingsFlow) { eleves, settings ->
        val limit = settings.seancesParPaiement
        eleves.filter { it.sessionsInCurrentCycle >= limit }
            .map { Pair(it, it.sessionsInCurrentCycle) }
    }
}
