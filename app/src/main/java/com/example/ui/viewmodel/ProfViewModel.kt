package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.local.AppDatabase
import com.example.data.local.entity.DossierNoteEntity
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.GroupeEntity
import com.example.data.local.entity.NoteEntity
import com.example.data.local.entity.PaiementEntity
import com.example.data.local.entity.RendezVousEntity
import com.example.data.local.entity.SeanceEntity
import com.example.data.local.entity.SettingsEntity
import com.example.data.repository.ProfRepository
import com.example.util.NotificationHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class ProfViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: ProfRepository = ProfRepository(AppDatabase.getInstance(application))

    init {
        viewModelScope.launch {
            repository.ensureDefaultGroupesExist()
        }
    }

    // State flows
    val allGroupes: StateFlow<List<GroupeEntity>> = repository.allGroupes.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val allEleves: StateFlow<List<EleveEntity>> = repository.allEleves.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val allRendezVous: StateFlow<List<RendezVousEntity>> = repository.allRendezVous.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val rendezVousAujourdhui: StateFlow<List<RendezVousEntity>> = repository.getRendezVousAujourdhui().stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val allSeances: StateFlow<List<SeanceEntity>> = repository.allSeances.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val seancesAujourdhui: StateFlow<List<SeanceEntity>> = repository.getSeancesAujourdhui().stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val allPaiements: StateFlow<List<PaiementEntity>> = repository.allPaiements.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val elevesPaiementEnAttente: StateFlow<List<Pair<EleveEntity, Int>>> = repository.elevesPaiementEnAttente.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val allNotes: StateFlow<List<NoteEntity>> = repository.allNotes.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val allDossiers: StateFlow<List<DossierNoteEntity>> = repository.allDossiers.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val settings: StateFlow<SettingsEntity> = repository.settingsFlow.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SettingsEntity()
    )

    // Global Instant Search query
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    // Filtered Students
    val filteredEleves: StateFlow<List<EleveEntity>> = combine(allEleves, _searchQuery) { eleves, query ->
        if (query.isBlank()) eleves
        else {
            val q = query.lowercase().trim()
            eleves.filter {
                it.nom.lowercase().contains(q) ||
                it.prenom.lowercase().contains(q) ||
                it.classe.lowercase().contains(q) ||
                (it.groupe != null && it.groupe.lowercase().contains(q)) ||
                it.telephone.contains(q)
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // ACTIONS: ELEVE
    fun addEleve(nom: String, prenom: String, telephone: String, classe: String, observation: String, groupe: String, anniversaire: String?) {
        viewModelScope.launch {
            repository.addEleve(
                EleveEntity(
                    nom = nom.trim(),
                    prenom = prenom.trim(),
                    telephone = telephone.trim(),
                    classe = classe.trim(),
                    observation = observation.trim(),
                    groupe = groupe.trim(),
                    anniversaire = anniversaire?.trim()?.ifBlank { null }
                )
            )
        }
    }

    fun updateEleve(eleve: EleveEntity) {
        viewModelScope.launch { repository.updateEleve(eleve) }
    }

    fun deleteEleve(eleve: EleveEntity) {
        viewModelScope.launch { repository.deleteEleve(eleve) }
    }

    // ACTIONS: GROUPES
    fun addGroupe(nom: String, jourSemaine: String, heureDebut: String, heureFin: String, lieu: String, remarque: String = "") {
        viewModelScope.launch {
            repository.addGroupe(
                GroupeEntity(
                    nom = nom.trim(),
                    jourSemaine = jourSemaine.trim(),
                    heureDebut = heureDebut.trim(),
                    heureFin = heureFin.trim(),
                    lieu = lieu.trim(),
                    remarque = remarque.trim()
                )
            )
        }
    }

    fun updateGroupe(groupe: GroupeEntity) {
        viewModelScope.launch { repository.updateGroupe(groupe) }
    }

    fun deleteGroupe(groupe: GroupeEntity) {
        viewModelScope.launch { repository.deleteGroupe(groupe) }
    }

    // AUTO-PROGRAMMING & REMINDERS FOR GROUP SESSIONS
    fun programmerProchaineSeanceGroupe(groupe: GroupeEntity, baseTimeEpochMs: Long = System.currentTimeMillis()) {
        viewModelScope.launch {
            val nextSlotMs = calculateNextWeeklySlotMs(groupe.jourSemaine, groupe.heureDebut, baseTimeEpochMs)
            
            // 1. Create RendezVous for the group
            val rdvId = repository.addRendezVous(
                RendezVousEntity(
                    nomEleve = "Groupe : ${groupe.nom}",
                    dateEpochMs = nextSlotMs,
                    heure = groupe.heureDebut,
                    dureeHeures = 2.0f,
                    lieu = groupe.lieu,
                    remarque = "Séance hebdomadaire auto-programmée (${groupe.jourSemaine} ${groupe.heureDebut}-${groupe.heureFin})"
                )
            )

            // 2. Update next session date in group entity
            repository.updateGroupe(groupe.copy(prochaineSeanceEpochMs = nextSlotMs))

            // 3. Schedule notification reminder
            val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)
            val dateStr = dateFormat.format(nextSlotMs)
            
            NotificationHelper.programmerNotificationRendezVous(
                getApplication(),
                rdvId = rdvId.toInt(),
                nomEleve = "Groupe ${groupe.nom}",
                heure = "${groupe.heureDebut} ($dateStr)",
                triggerTimeEpochMs = nextSlotMs - (3600 * 1000) // 1 hour before
            )
        }
    }

    private fun calculateNextWeeklySlotMs(jourSemaine: String, heureDebut: String, fromMs: Long): Long {
        val cal = Calendar.getInstance()
        cal.timeInMillis = fromMs

        val dayTarget = when (jourSemaine.lowercase(Locale.FRANCE).trim()) {
            "lundi" -> Calendar.MONDAY
            "mardi" -> Calendar.TUESDAY
            "mercredi" -> Calendar.WEDNESDAY
            "jeudi" -> Calendar.THURSDAY
            "vendredi" -> Calendar.FRIDAY
            "samedi" -> Calendar.SATURDAY
            "dimanche" -> Calendar.SUNDAY
            else -> Calendar.SATURDAY
        }

        val parts = heureDebut.split(":")
        val h = parts.getOrNull(0)?.toIntOrNull() ?: 14
        val m = parts.getOrNull(1)?.toIntOrNull() ?: 0

        cal.set(Calendar.HOUR_OF_DAY, h)
        cal.set(Calendar.MINUTE, m)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)

        if (cal.timeInMillis <= fromMs) {
            cal.add(Calendar.DAY_OF_YEAR, 7)
        }

        var count = 0
        while (cal.get(Calendar.DAY_OF_WEEK) != dayTarget && count < 7) {
            cal.add(Calendar.DAY_OF_YEAR, 1)
            count++
        }

        return cal.timeInMillis
    }

    // ACTIONS: RENDEZ-VOUS
    fun addRendezVous(nomEleve: String, dateEpochMs: Long, heure: String, dureeHeures: Float, lieu: String, remarque: String, eleveId: Int? = null) {
        viewModelScope.launch {
            repository.addRendezVous(
                RendezVousEntity(
                    eleveId = eleveId,
                    nomEleve = nomEleve.trim(),
                    dateEpochMs = dateEpochMs,
                    heure = heure,
                    dureeHeures = dureeHeures,
                    lieu = lieu,
                    remarque = remarque
                )
            )
        }
    }

    fun updateRendezVous(rdv: RendezVousEntity) {
        viewModelScope.launch { repository.updateRendezVous(rdv) }
    }

    fun deleteRendezVous(rdv: RendezVousEntity) {
        viewModelScope.launch { repository.deleteRendezVous(rdv) }
    }

    // ACTIONS: SEANCES & PRESENCES
    fun enregistrerPresenceSeance(eleveId: Int, nomEleve: String, groupe: String, statut: String, heure: String, dureeHeures: Float, commentaire: String, dateMs: Long) {
        viewModelScope.launch {
            repository.addSeanceAndIncrementCount(
                SeanceEntity(
                    eleveId = eleveId,
                    dateEpochMs = dateMs,
                    heure = heure,
                    dureeHeures = dureeHeures,
                    statut = statut,
                    commentaire = commentaire,
                    nomEleveCache = nomEleve,
                    groupeCache = groupe
                )
            )
        }
    }

    fun enregistrerPresencesBatch(seances: List<SeanceEntity>) {
        viewModelScope.launch { repository.addBatchSeances(seances) }
    }

    fun deleteSeance(seance: SeanceEntity) {
        viewModelScope.launch { repository.deleteSeance(seance) }
    }

    // ACTIONS: PAIEMENTS
    fun marquerPaiementRecu(eleveId: Int, nomEleve: String, montant: Double, modePaiement: String, nbSeances: Int, observation: String) {
        viewModelScope.launch {
            repository.marquerPaiementRecu(eleveId, nomEleve, montant, modePaiement, nbSeances, observation)
        }
    }

    // ACTIONS: NOTES
    fun addNote(titre: String, contenu: String, dossierId: Int?, estFavori: Boolean = false) {
        viewModelScope.launch {
            repository.addNote(
                NoteEntity(
                    titre = titre.trim(),
                    contenu = contenu.trim(),
                    dossierId = dossierId,
                    estFavori = estFavori
                )
            )
        }
    }

    fun updateNote(note: NoteEntity) {
        viewModelScope.launch { repository.updateNote(note) }
    }

    fun deleteNote(note: NoteEntity) {
        viewModelScope.launch { repository.deleteNote(note) }
    }

    fun addDossier(nom: String) {
        viewModelScope.launch { repository.addDossier(nom) }
    }

    fun deleteDossier(dossier: DossierNoteEntity) {
        viewModelScope.launch { repository.deleteDossier(dossier) }
    }

    // ACTIONS: SETTINGS
    fun saveSettings(newSettings: SettingsEntity) {
        viewModelScope.launch { repository.saveSettings(newSettings) }
    }
}
