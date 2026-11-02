package com.example.ui.viewmodel

import android.app.Application
import android.content.Context
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
import com.example.util.CodeAcces
import com.example.util.NotificationHelper
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

private const val JOUR_MS = 24L * 60 * 60 * 1000

private fun debutDuJour(ms: Long): Long = Calendar.getInstance().apply {
    timeInMillis = ms
    set(Calendar.HOUR_OF_DAY, 0)
    set(Calendar.MINUTE, 0)
    set(Calendar.SECOND, 0)
    set(Calendar.MILLISECOND, 0)
}.timeInMillis

/** Combine une date (jour) et une heure "HH:mm" en un instant précis. */
fun combinerDateHeure(dateMs: Long, heure: String): Long {
    val parts = heure.trim().split(":", "h", "H")
    val h = parts.getOrNull(0)?.trim()?.toIntOrNull()?.coerceIn(0, 23) ?: 0
    val m = parts.getOrNull(1)?.trim()?.toIntOrNull()?.coerceIn(0, 59) ?: 0
    return debutDuJour(dateMs) + h * 3_600_000L + m * 60_000L
}

/** Saisie rapide d'un nouvel élève depuis l'écran Groupes. */
data class NouvelEleve(val prenom: String, val nom: String, val telephone: String = "", val classe: String = "")

private const val RAPPEL_AVANT_MS = 60L * 60 * 1000 // rappel 1 h avant

class ProfViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: ProfRepository = ProfRepository(AppDatabase.getInstance(application))

    // Style d'affichage (Classique / Chic) : enregistré dans les préférences du téléphone
    // pour ne pas modifier la base de données.
    private val prefsApparence = application.getSharedPreferences("apparence", Context.MODE_PRIVATE)
    private val _styleChic = MutableStateFlow(prefsApparence.getBoolean("style_chic", false))
    val styleChic: StateFlow<Boolean> = _styleChic.asStateFlow()

    // ---------- Code d'accès ----------
    private val codeAcces = CodeAcces(application)
    private val _verrouille = MutableStateFlow(codeAcces.actif)
    val verrouille: StateFlow<Boolean> = _verrouille.asStateFlow()
    private val _codeActif = MutableStateFlow(codeAcces.actif)
    val codeActif: StateFlow<Boolean> = _codeActif.asStateFlow()
    val codeParDefaut: Boolean get() = codeAcces.estParDefaut

    fun deverrouiller(code: String): Boolean {
        val ok = codeAcces.verifier(code)
        if (ok) _verrouille.value = false
        return ok
    }

    fun verrouiller() {
        if (codeAcces.actif) _verrouille.value = true
    }

    /** Renvoie un message d'erreur, ou null si le code a été changé. */
    fun changerCode(actuel: String, nouveau: String, confirmation: String): String? = when {
        !codeAcces.verifier(actuel) -> "Le code actuel est incorrect."
        !CodeAcces.estValide(nouveau) -> "Le nouveau code doit contenir 4 à 8 chiffres."
        nouveau != confirmation -> "La confirmation ne correspond pas."
        else -> { codeAcces.changer(nouveau); null }
    }

    /** Activer/désactiver le code : le code actuel est demandé pour désactiver. */
    fun setCodeActif(actif: Boolean, codeActuel: String = ""): Boolean {
        if (!actif && !codeAcces.verifier(codeActuel)) return false
        codeAcces.actif = actif
        _codeActif.value = actif
        return true
    }

    fun setStyleChic(chic: Boolean) {
        prefsApparence.edit().putBoolean("style_chic", chic).apply()
        _styleChic.value = chic
    }

    init {
        viewModelScope.launch {
            repository.ensureDefaultGroupesExist()
        }
        // Rappels automatiques : 1 h avant le cours de chaque groupe (créneau hebdomadaire).
        // Reprogrammés à chaque modification des groupes.
        viewModelScope.launch {
            var anciensIds = emptySet<Int>()
            repository.allGroupes.collect { groupes ->
                val ids = groupes.map { it.id }.toSet()
                (anciensIds - ids).forEach { NotificationHelper.annulerRappelGroupe(getApplication(), it) }
                groupes.forEach { g ->
                    val debut = calculateNextWeeklySlotMs(g.jourSemaine, g.heureDebut, System.currentTimeMillis() + RAPPEL_AVANT_MS)
                    NotificationHelper.programmerRappelGroupe(getApplication(), g.id, g.nom, g.heureDebut, g.lieu, debut - RAPPEL_AVANT_MS)
                }
                anciensIds = ids
            }
        }
    }

    // State flows
    val allGroupes: StateFlow<List<GroupeEntity>> = repository.allGroupes.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = emptyList()
    )

    val allEleves: StateFlow<List<EleveEntity>> = repository.allEleves.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = emptyList()
    )

    val allRendezVous: StateFlow<List<RendezVousEntity>> = repository.allRendezVous.stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = emptyList()
    )

    // "Aujourd'hui" est recalculé à chaque minute : avant, la date était figée au
    // lancement de l'app et les listes du jour devenaient fausses après minuit.
    private val debutJourCourant: Flow<Long> = flow {
        while (true) {
            emit(debutDuJour(System.currentTimeMillis()))
            delay(60_000)
        }
    }.distinctUntilChanged()

    val rendezVousAujourdhui: StateFlow<List<RendezVousEntity>> =
        combine(repository.allRendezVous, debutJourCourant) { rdvs, debut ->
            rdvs.filter { !it.estAnnule && it.dateEpochMs in debut until debut + JOUR_MS }.sortedBy { it.heure }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allSeances: StateFlow<List<SeanceEntity>> = repository.allSeances.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )

    val seancesAujourdhui: StateFlow<List<SeanceEntity>> =
        combine(repository.allSeances, debutJourCourant) { seances, debut ->
            seances.filter { it.dateEpochMs in debut until debut + JOUR_MS }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

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
        started = SharingStarted.Eagerly,
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
        creerGroupe(nom, jourSemaine, heureDebut, heureFin, lieu, remarque) {}
    }

    /** Crée un groupe puis appelle [onCree] avec le groupe enregistré (pour enchaîner sur l'ajout d'élèves). */
    fun creerGroupe(
        nom: String, jourSemaine: String, heureDebut: String, heureFin: String, lieu: String, remarque: String = "",
        onCree: (GroupeEntity) -> Unit
    ) {
        viewModelScope.launch {
            val groupe = GroupeEntity(
                nom = nom.trim(),
                jourSemaine = jourSemaine.trim(),
                heureDebut = heureDebut.trim(),
                heureFin = heureFin.trim(),
                lieu = lieu.trim(),
                remarque = remarque.trim()
            )
            val id = repository.addGroupe(groupe)
            onCree(groupe.copy(id = id.toInt()))
        }
    }

    fun updateGroupe(groupe: GroupeEntity) {
        viewModelScope.launch { repository.updateGroupe(groupe) }
    }

    fun deleteGroupe(groupe: GroupeEntity) {
        viewModelScope.launch { repository.deleteGroupe(groupe) }
    }

    /** Ajoute au groupe des élèves existants (ids) et/ou de nouveaux élèves. */
    fun ajouterElevesAuGroupe(groupe: GroupeEntity, idsExistants: List<Int>, nouveaux: List<NouvelEleve>) {
        viewModelScope.launch {
            repository.affecterAuGroupe(idsExistants, groupe.nom)
            if (nouveaux.isNotEmpty()) {
                repository.addEleves(nouveaux.map {
                    EleveEntity(
                        nom = it.nom.trim(),
                        prenom = it.prenom.trim(),
                        telephone = it.telephone.trim(),
                        classe = it.classe.trim(),
                        groupe = groupe.nom
                    )
                })
            }
        }
    }

    fun retirerDuGroupe(eleve: EleveEntity) {
        viewModelScope.launch { repository.retirerDuGroupe(eleve.id) }
    }

    // AUTO-PROGRAMMING & REMINDERS FOR GROUP SESSIONS
    fun programmerProchaineSeanceGroupe(groupe: GroupeEntity, baseTimeEpochMs: Long = System.currentTimeMillis()) {
        viewModelScope.launch {
            val nextSlotMs = calculateNextWeeklySlotMs(groupe.jourSemaine, groupe.heureDebut, baseTimeEpochMs)
            val dureeHeures = dureeEntre(groupe.heureDebut, groupe.heureFin) ?: settings.value.dureeParDefautHeures

            // Évite de créer deux fois le même rendez-vous si on appuie plusieurs fois
            val nomRdv = "Groupe : ${groupe.nom}"
            val dejaProgramme = allRendezVous.value.any { it.nomEleve == nomRdv && it.dateEpochMs == nextSlotMs && !it.estAnnule }
            if (dejaProgramme) return@launch

            val rdvId = repository.addRendezVous(
                RendezVousEntity(
                    nomEleve = nomRdv,
                    dateEpochMs = nextSlotMs,
                    heure = groupe.heureDebut,
                    dureeHeures = dureeHeures,
                    lieu = groupe.lieu,
                    remarque = "Séance hebdomadaire auto-programmée (${groupe.jourSemaine} ${groupe.heureDebut}-${groupe.heureFin})"
                )
            )

            repository.updateGroupe(groupe.copy(prochaineSeanceEpochMs = nextSlotMs))

            val dateStr = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE).format(nextSlotMs)
            NotificationHelper.programmerNotificationRendezVous(
                getApplication(),
                rdvId = rdvId.toInt(),
                nomEleve = "Groupe ${groupe.nom}",
                heure = "${groupe.heureDebut} ($dateStr)",
                triggerTimeEpochMs = nextSlotMs - RAPPEL_AVANT_MS
            )
        }
    }

    private fun dureeEntre(debut: String, fin: String): Float? {
        val d = combinerDateHeure(0, debut)
        val f = combinerDateHeure(0, fin)
        return if (f > d) (f - d) / 3_600_000f else null
    }

    /**
     * Correction : l'ancien calcul ajoutait 7 jours PUIS cherchait le bon jour,
     * ce qui pouvait programmer la séance jusqu'à 13 jours plus tard.
     */
    private fun calculateNextWeeklySlotMs(jourSemaine: String, heureDebut: String, fromMs: Long): Long {
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

        val cal = Calendar.getInstance()
        cal.timeInMillis = combinerDateHeure(fromMs, heureDebut)
        // Avancer jusqu'au bon jour de la semaine (0 à 6 jours)
        while (cal.get(Calendar.DAY_OF_WEEK) != dayTarget) {
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        // Si c'est aujourd'hui mais que l'heure est passée : semaine suivante
        if (cal.timeInMillis <= fromMs) {
            cal.add(Calendar.DAY_OF_YEAR, 7)
        }
        return cal.timeInMillis
    }

    // ACTIONS: RENDEZ-VOUS
    /**
     * Correction : la date du rendez-vous ne tenait pas compte de l'heure saisie, et le
     * rappel était programmé "maintenant" (donc jamais déclenché). Le rappel est maintenant
     * programmé 1 h avant le cours, avec l'identifiant réel du rendez-vous.
     */
    fun addRendezVous(nomEleve: String, dateEpochMs: Long, heure: String, dureeHeures: Float, lieu: String, remarque: String, eleveId: Int? = null) {
        viewModelScope.launch {
            val debutMs = combinerDateHeure(dateEpochMs, heure)
            val rdvId = repository.addRendezVous(
                RendezVousEntity(
                    eleveId = eleveId,
                    nomEleve = nomEleve.trim(),
                    dateEpochMs = debutMs,
                    heure = heure.trim(),
                    dureeHeures = dureeHeures,
                    lieu = lieu.trim(),
                    remarque = remarque.trim()
                )
            )
            NotificationHelper.programmerNotificationRendezVous(
                getApplication(),
                rdvId = rdvId.toInt(),
                nomEleve = nomEleve.trim(),
                heure = heure.trim(),
                triggerTimeEpochMs = debutMs - RAPPEL_AVANT_MS
            )
        }
    }

    fun updateRendezVous(rdv: RendezVousEntity) {
        viewModelScope.launch { repository.updateRendezVous(rdv) }
    }

    /** Reporte une séance à une autre date/heure : le rappel est déplacé. */
    fun reporterRendezVous(rdv: RendezVousEntity, nouveauJourMs: Long, nouvelleHeure: String) {
        viewModelScope.launch {
            val debutMs = combinerDateHeure(nouveauJourMs, nouvelleHeure)
            val maj = rdv.copy(dateEpochMs = debutMs, heure = nouvelleHeure.trim(), estAnnule = false)
            repository.updateRendezVous(maj)
            NotificationHelper.annulerNotificationRendezVous(getApplication(), rdv.id)
            NotificationHelper.programmerNotificationRendezVous(
                getApplication(), rdv.id, rdv.nomEleve, nouvelleHeure.trim(), debutMs - RAPPEL_AVANT_MS
            )
        }
    }

    /** Annule une séance (elle reste visible, barrée) ou la rétablit. */
    fun annulerRendezVous(rdv: RendezVousEntity, annule: Boolean) {
        viewModelScope.launch {
            repository.updateRendezVous(rdv.copy(estAnnule = annule))
            if (annule) {
                NotificationHelper.annulerNotificationRendezVous(getApplication(), rdv.id)
            } else {
                NotificationHelper.programmerNotificationRendezVous(
                    getApplication(), rdv.id, rdv.nomEleve, rdv.heure, rdv.dateEpochMs - RAPPEL_AVANT_MS
                )
            }
        }
    }

    fun deleteRendezVous(rdv: RendezVousEntity) {
        viewModelScope.launch {
            repository.deleteRendezVous(rdv)
            NotificationHelper.annulerNotificationRendezVous(getApplication(), rdv.id)
        }
    }

    /** Heure du prochain cours d'un élève (rendez-vous à venir, sinon créneau de son groupe). */
    fun heureProchainCours(eleve: EleveEntity): String {
        val now = System.currentTimeMillis()
        val rdv = allRendezVous.value
            .filter { !it.estAnnule && it.dateEpochMs >= now && (it.eleveId == eleve.id || (eleve.groupe != null && it.nomEleve == "Groupe : ${eleve.groupe}")) }
            .minByOrNull { it.dateEpochMs }
        if (rdv != null) return rdv.heure
        val groupe = allGroupes.value.firstOrNull { it.nom.equals(eleve.groupe, ignoreCase = true) }
        return groupe?.heureDebut ?: "l'heure prévue"
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

    /**
     * Enregistre l'appel, puis notifie le professeur pour chaque élève qui vient
     * d'atteindre le nombre de séances à payer (ex. 4).
     */
    fun enregistrerPresencesBatch(seances: List<SeanceEntity>) {
        viewModelScope.launch {
            val limite = settings.value.seancesParPaiement
            val avant = allEleves.value.associate { it.id to it.sessionsInCurrentCycle }
            repository.addBatchSeances(seances)
            val comptees = seances.filter { it.statut == "P" || it.statut == "R" }.groupingBy { it.eleveId }.eachCount()
            comptees.forEach { (id, n) ->
                val a = avant[id] ?: return@forEach
                if (a < limite && a + n >= limite) {
                    val nom = seances.first { it.eleveId == id }.nomEleveCache
                    NotificationHelper.notifierPaiementAttendu(getApplication(), id, nom, limite)
                }
            }
        }
    }

    /** Correction le jour même (code exigé à l'écran) : supprime l'appel du groupe pour le refaire. */
    fun annulerAppelDuJour(groupe: String) {
        viewModelScope.launch {
            seancesAujourdhui.value.filter { it.groupeCache.equals(groupe, ignoreCase = true) }.forEach { repository.deleteSeance(it) }
        }
    }

    fun verifierCode(code: String): Boolean = codeAcces.verifier(code)

    // ACTIONS: PAIEMENTS
    fun marquerPaiementRecu(
        eleveId: Int, nomEleve: String, montant: Double, modePaiement: String, nbSeances: Int, observation: String,
        estEncaisse: Boolean = true
    ) {
        viewModelScope.launch {
            repository.marquerPaiementRecu(eleveId, nomEleve, montant, modePaiement, nbSeances, observation, estEncaisse)
        }
    }

    fun modifierPaiement(paiement: PaiementEntity) {
        viewModelScope.launch { repository.modifierPaiement(paiement) }
    }

    fun supprimerPaiement(paiement: PaiementEntity) {
        viewModelScope.launch { repository.supprimerPaiement(paiement) }
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
