package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.GroupeEntity
import com.example.ui.theme.*
import com.example.ui.navigation.RaccourcisNavigation
import com.example.ui.viewmodel.ProfViewModel
import com.example.util.CommunicationHelper
import com.example.util.remplirModele
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ElevesScreen(
    viewModel: ProfViewModel,
    showAddDialogInitially: Boolean = false,
    onAddDialogDismissed: () -> Unit = {}
) {
    val context = LocalContext.current
    val eleves by viewModel.filteredEleves.collectAsState()
    val allGroupes by viewModel.allGroupes.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val settings by viewModel.settings.collectAsState()

    var viewModeByGroup by remember { mutableStateOf(false) }
    var showAddModal by remember { mutableStateOf(showAddDialogInitially) }
    var showAddGroupModal by remember { mutableStateOf(false) }
    var selectedEleveForDetails by remember { mutableStateOf<EleveEntity?>(null) }
    var eleveToEdit by remember { mutableStateOf<EleveEntity?>(null) }

    var eleveASupprimer by remember { mutableStateOf<EleveEntity?>(null) }
    var groupeASupprimer by remember { mutableStateOf<GroupeEntity?>(null) }
    var ajoutDansGroupe by remember { mutableStateOf<GroupeEntity?>(null) }

    // Correction : {heure} était toujours remplacé par "16:00"
    fun messageRappel(eleve: EleveEntity) = remplirModele(
        settings.smsTemplateRappel, eleve.prenom, eleve.nom, eleve.classe, viewModel.heureProchainCours(eleve)
    )

    LaunchedEffect(showAddDialogInitially) {
        if (showAddDialogInitially) showAddModal = true
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Élèves (${eleves.size})", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { showAddGroupModal = true }) {
                        Icon(Icons.Default.GroupAdd, contentDescription = "Créer un Groupe", tint = PrimaryBlue)
                    }
                    RaccourcisNavigation()
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddModal = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Ajouter élève")
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
        ) {
            // View Mode Switch Tabs (Tous vs Par Groupe)
            SingleChoiceSegmentedButtonRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 6.dp)
            ) {
                SegmentedButton(
                    selected = !viewModeByGroup,
                    onClick = { viewModeByGroup = false },
                    shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2)
                ) {
                    Text("Tous (${eleves.size})")
                }
                SegmentedButton(
                    selected = viewModeByGroup,
                    onClick = { viewModeByGroup = true },
                    shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2)
                ) {
                    Text("Organisés par Groupe")
                }
            }

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                placeholder = { Text("Rechercher élève, téléphone, groupe...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.setSearchQuery("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Effacer")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            if (eleves.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.PersonSearch,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = if (searchQuery.isBlank()) "Aucun élève enregistré." else "Aucun résultat trouvé.",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else if (!viewModeByGroup) {
                // List of all students
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(bottom = 80.dp, top = 8.dp)
                ) {
                    items(eleves, key = { it.id }) { eleve ->
                        EleveCardItem(
                            eleve = eleve,
                            limitCycle = settings.seancesParPaiement,
                            onClick = { selectedEleveForDetails = eleve },
                            onCall = { CommunicationHelper.telephoner(context, eleve.telephone) },
                            onSms = { CommunicationHelper.envoyerSms(context, eleve.telephone, messageRappel(eleve)) },
                            onWhatsapp = { CommunicationHelper.envoyerWhatsapp(context, eleve.telephone, messageRappel(eleve)) }
                        )
                    }
                }
            } else {
                // Grouped By Group View (Requirement 4)
                // Correction : les groupes sans élève n'apparaissaient pas du tout
                val parGroupe = eleves.groupBy { it.groupe?.takeIf { g -> g.isNotBlank() } ?: "Non classé" }
                val groupedStudents: Map<String, List<EleveEntity>> =
                    allGroupes.associate { g ->
                        g.nom to parGroupe.entries.filter { it.key.equals(g.nom, ignoreCase = true) }.flatMap { it.value }
                    } + parGroupe.filterKeys { k -> allGroupes.none { it.nom.equals(k, ignoreCase = true) } }

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(bottom = 80.dp, top = 8.dp)
                ) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Groupes & Créneaux Fixés", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = PrimaryBlue)
                            TextButton(onClick = { showAddGroupModal = true }) {
                                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Nouveau Groupe")
                            }
                        }
                    }

                    groupedStudents.forEach { (groupName, studentList) ->
                        val matchingGroupEntity = allGroupes.firstOrNull { it.nom.equals(groupName, ignoreCase = true) }
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                text = groupName,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 18.sp,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                            val timeSlot = if (matchingGroupEntity != null) {
                                                "📅 Chaque ${matchingGroupEntity.jourSemaine} ${matchingGroupEntity.heureDebut} - ${matchingGroupEntity.heureFin} (${matchingGroupEntity.lieu})"
                                            } else {
                                                "📅 Créneau hebdomadaire à configurer"
                                            }
                                            Text(
                                                text = timeSlot,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Medium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Badge(containerColor = PrimaryBlue) {
                                                Text("${studentList.size} élève(s)", modifier = Modifier.padding(4.dp))
                                            }
                                            if (matchingGroupEntity != null) {
                                                IconButton(onClick = { groupeASupprimer = matchingGroupEntity }) {
                                                    Icon(Icons.Default.Delete, contentDescription = "Supprimer le groupe", tint = MaterialTheme.colorScheme.outline)
                                                }
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))
                                    Divider()
                                    Spacer(modifier = Modifier.height(8.dp))

                                    studentList.forEach { eleve ->
                                        EleveQuickRowItem(
                                            eleve = eleve,
                                            onClick = { selectedEleveForDetails = eleve }
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                    }

                                    if (matchingGroupEntity != null) {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Button(onClick = { ajoutDansGroupe = matchingGroupEntity }, modifier = Modifier.fillMaxWidth()) {
                                            Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("Ajouter des élèves")
                                        }
                                        OutlinedButton(
                                            onClick = {
                                                viewModel.programmerProchaineSeanceGroupe(matchingGroupEntity)
                                                Toast.makeText(context, "Séance ${matchingGroupEntity.nom} programmée avec rappel !", Toast.LENGTH_LONG).show()
                                            },
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Icon(Icons.Default.EventRepeat, contentDescription = null, modifier = Modifier.size(18.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("Programmer la prochaine séance hebdomadaire")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal: Add/Edit Student (Groupe field mandatory!)
    if (showAddModal || eleveToEdit != null) {
        AddOrEditEleveDialog(
            eleve = eleveToEdit,
            configuredGroupes = allGroupes,
            onDismiss = {
                showAddModal = false
                eleveToEdit = null
                onAddDialogDismissed()
            },
            onSave = { nom, prenom, tel, classe, obs, groupe, anniversaire ->
                if (eleveToEdit != null) {
                    viewModel.updateEleve(
                        eleveToEdit!!.copy(
                            nom = nom,
                            prenom = prenom,
                            telephone = tel,
                            classe = classe,
                            observation = obs,
                            groupe = groupe,
                            anniversaire = anniversaire
                        )
                    )
                } else {
                    viewModel.addEleve(nom, prenom, tel, classe, obs, groupe, anniversaire)
                }
                showAddModal = false
                eleveToEdit = null
                onAddDialogDismissed()
            }
        )
    }

    // Modal: Create Group & Set Weekly Time Slot
    // Création d'un groupe en 2 étapes (même assistant que l'écran Groupes)
    if (showAddGroupModal) {
        GroupeFormDialog(
            groupe = null,
            autresGroupes = allGroupes,
            onDismiss = { showAddGroupModal = false },
            onSave = { nom, jour, debut, fin, lieu ->
                showAddGroupModal = false
                viewModel.creerGroupe(nom, jour, debut, fin, lieu) { cree -> ajoutDansGroupe = cree }
            }
        )
    }

    ajoutDansGroupe?.let { g ->
        AjoutElevesDialog(
            groupe = g,
            eleves = viewModel.allEleves.collectAsState().value,
            onDismiss = { ajoutDansGroupe = null },
            onConfirm = { ids, nouveaux ->
                viewModel.ajouterElevesAuGroupe(g, ids, nouveaux)
                Toast.makeText(context, "${ids.size + nouveaux.size} élève(s) ajouté(s) à ${g.nom}", Toast.LENGTH_SHORT).show()
                ajoutDansGroupe = null
            }
        )
    }

    // Sheet: Student Details
    if (selectedEleveForDetails != null) {
        val eleve = selectedEleveForDetails!!
        EleveDetailsBottomSheet(
            eleve = eleve,
            limitCycle = settings.seancesParPaiement,
            onDismiss = { selectedEleveForDetails = null },
            onCall = { CommunicationHelper.telephoner(context, eleve.telephone) },
            onSms = { CommunicationHelper.envoyerSms(context, eleve.telephone, messageRappel(eleve)) },
            onWhatsapp = { CommunicationHelper.envoyerWhatsapp(context, eleve.telephone, messageRappel(eleve)) },
            onShare = {
                CommunicationHelper.partagerContact(context, eleve.nom, eleve.prenom, eleve.telephone, eleve.classe)
            },
            onEdit = {
                eleveToEdit = eleve
                selectedEleveForDetails = null
            },
            onDelete = {
                // Correction : suppression immédiate sans confirmation
                eleveASupprimer = eleve
                selectedEleveForDetails = null
            }
        )
    }

    eleveASupprimer?.let { eleve ->
        AlertDialog(
            onDismissRequest = { eleveASupprimer = null },
            title = { Text("Supprimer ${eleve.prenom} ${eleve.nom} ?") },
            text = { Text("Cette action est définitive. L'historique des séances et paiements est conservé.") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteEleve(eleve)
                    eleveASupprimer = null
                }) { Text("Supprimer", color = StatusRed) }
            },
            dismissButton = { TextButton(onClick = { eleveASupprimer = null }) { Text("Annuler") } }
        )
    }

    groupeASupprimer?.let { groupe ->
        AlertDialog(
            onDismissRequest = { groupeASupprimer = null },
            title = { Text("Supprimer le groupe ${groupe.nom} ?") },
            text = { Text("Le groupe et son créneau seront supprimés. Les élèves sont conservés et passent « sans groupe ».") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteGroupe(groupe)
                    groupeASupprimer = null
                }) { Text("Supprimer", color = StatusRed) }
            },
            dismissButton = { TextButton(onClick = { groupeASupprimer = null }) { Text("Annuler") } }
        )
    }
}

@Composable
fun EleveQuickRowItem(eleve: EleveEntity, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(PrimaryBlue.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "${eleve.prenom.take(1)}${eleve.nom.take(1)}".uppercase(),
                fontWeight = FontWeight.Bold,
                color = PrimaryBlue,
                fontSize = 12.sp
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text("${eleve.prenom} ${eleve.nom}", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text("Classe: ${eleve.classe} • Tél: ${eleve.telephone}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun EleveCardItem(
    eleve: EleveEntity,
    limitCycle: Int,
    onClick: () -> Unit,
    onCall: () -> Unit,
    onSms: () -> Unit,
    onWhatsapp: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(PrimaryBlue.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "${eleve.prenom.take(1)}${eleve.nom.take(1)}".uppercase(),
                        fontWeight = FontWeight.Bold,
                        color = PrimaryBlue,
                        fontSize = 16.sp
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "${eleve.prenom} ${eleve.nom}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Text(
                        text = "Classe : ${eleve.classe} • Groupe : ${eleve.groupe?.ifBlank { null } ?: "Aucun"}",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "Tél: ${eleve.telephone}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                
                Badge(
                    containerColor = if (eleve.sessionsInCurrentCycle >= limitCycle) StatusRed else StatusGreenBg,
                    contentColor = if (eleve.sessionsInCurrentCycle >= limitCycle) Color.White else StatusGreen
                ) {
                    Text(
                        text = com.example.util.libelleCycle(eleve.sessionsInCurrentCycle, limitCycle),
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        fontSize = 12.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
            Spacer(modifier = Modifier.height(6.dp))

            // Quick Direct Action Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                IconButton(onClick = onCall) {
                    Icon(Icons.Default.Phone, contentDescription = "Appeler", tint = PrimaryBlue)
                }
                IconButton(onClick = onSms) {
                    Icon(Icons.Default.Sms, contentDescription = "SMS", tint = SecondaryBlue)
                }
                IconButton(onClick = onWhatsapp) {
                    Icon(Icons.Default.Chat, contentDescription = "WhatsApp", tint = StatusGreen)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EleveDetailsBottomSheet(
    eleve: EleveEntity,
    limitCycle: Int,
    onDismiss: () -> Unit,
    onCall: () -> Unit,
    onSms: () -> Unit,
    onWhatsapp: () -> Unit,
    onShare: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(PrimaryBlue.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "${eleve.prenom.take(1)}${eleve.nom.take(1)}".uppercase(),
                        fontWeight = FontWeight.Bold,
                        color = PrimaryBlue,
                        fontSize = 20.sp
                    )
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "${eleve.prenom} ${eleve.nom}",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Classe : ${eleve.classe} • Groupe : ${eleve.groupe?.ifBlank { null } ?: "Aucun"}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(text = "Téléphone : ${eleve.telephone}", fontWeight = FontWeight.Medium)
                    if (!eleve.anniversaire.isNull_or_empty()) {
                        Text(text = "Anniversaire : ${eleve.anniversaire}", fontSize = 13.sp)
                    }
                    Text(
                        text = if (eleve.sessionsInCurrentCycle < 0) "Séances payées d'avance : ${-eleve.sessionsInCurrentCycle}"
                               else "Séances à payer : ${eleve.sessionsInCurrentCycle} / $limitCycle",
                        fontSize = 13.sp
                    )
                    Text(text = "Total séances historiques : ${eleve.totalSeancesRealisees}", fontSize = 13.sp)
                    if (eleve.observation.isNotBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "Observation : ${eleve.observation}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text("Actions Rapides :", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = onCall,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue)
                ) {
                    Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Appeler")
                }
                Button(
                    onClick = onSms,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = SecondaryBlue)
                ) {
                    Icon(Icons.Default.Sms, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("SMS")
                }
                Button(
                    onClick = onWhatsapp,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = StatusGreen)
                ) {
                    Icon(Icons.Default.Chat, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("WhatsApp")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(onClick = onShare, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Partager")
                }
                OutlinedButton(onClick = onEdit, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Modifier")
                }
                OutlinedButton(
                    onClick = onDelete,
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = StatusRed)
                ) {
                    Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Supprimer")
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddOrEditEleveDialog(
    eleve: EleveEntity? = null,
    configuredGroupes: List<GroupeEntity> = emptyList(),
    onDismiss: () -> Unit,
    onSave: (nom: String, prenom: String, tel: String, classe: String, obs: String, groupe: String, anniversaire: String?) -> Unit
) {
    var nom by remember { mutableStateOf(eleve?.nom ?: "") }
    var prenom by remember { mutableStateOf(eleve?.prenom ?: "") }
    var telephone by remember { mutableStateOf(eleve?.telephone ?: "") }
    var classe by remember { mutableStateOf(eleve?.classe ?: "") }
    var groupe by remember { mutableStateOf(eleve?.groupe ?: (configuredGroupes.firstOrNull()?.nom ?: "")) }
    var anniversaire by remember { mutableStateOf(eleve?.anniversaire ?: "") }
    var observation by remember { mutableStateOf(eleve?.observation ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (eleve == null) "Ajouter un Élève" else "Modifier Élève") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.verticalScroll(rememberScrollState())
            ) {
                OutlinedTextField(
                    value = nom,
                    onValueChange = { nom = it },
                    label = { Text("Nom *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = prenom,
                    onValueChange = { prenom = it },
                    label = { Text("Prénom *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = telephone,
                    onValueChange = { telephone = it },
                    label = { Text("Téléphone *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = classe,
                    onValueChange = { classe = it },
                    label = { Text("Classe * (ex: Bac Math, 3ème)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                // Groupe Field - MANDATORY (Requirement 2)
                Column {
                    Text("Groupe * (Affectation Obligatoire)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = PrimaryBlue)
                    Spacer(modifier = Modifier.height(4.dp))
                    OutlinedTextField(
                        value = groupe,
                        onValueChange = { groupe = it },
                        label = { Text("Groupe * (Saisir ou choisir ci-dessous)") },
                        singleLine = true,
                        isError = groupe.isBlank(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    if (configuredGroupes.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Groupes existants :", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(top = 4.dp)
                        ) {
                            configuredGroupes.forEach { g ->
                                FilterChip(
                                    selected = groupe.equals(g.nom, ignoreCase = true),
                                    onClick = { groupe = g.nom },
                                    label = { Text(g.nom, fontSize = 11.sp) }
                                )
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = anniversaire,
                    onValueChange = { anniversaire = it },
                    label = { Text("Anniversaire (jj/mm) Facultatif") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = observation,
                    onValueChange = { observation = it },
                    label = { Text("Observation / Remarque") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (nom.isNotBlank() && prenom.isNotBlank() && telephone.isNotBlank() && classe.isNotBlank() && groupe.isNotBlank()) {
                        onSave(nom.trim(), prenom.trim(), telephone.trim(), classe.trim(), observation.trim(), groupe.trim(), anniversaire.trim().ifBlank { null })
                    }
                },
                enabled = nom.isNotBlank() && prenom.isNotBlank() && telephone.isNotBlank() && classe.isNotBlank() && groupe.isNotBlank()
            ) {
                Text(if (eleve == null) "Créer" else "Enregistrer")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuler") }
        }
    )
}

private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()
