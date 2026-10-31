package com.example.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.RendezVousEntity
import com.example.ui.theme.*
import com.example.ui.navigation.RaccourcisNavigation
import com.example.ui.viewmodel.ProfViewModel
import com.example.util.formatDuree
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import java.util.TimeZone
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RendezVousScreen(viewModel: ProfViewModel) {
    val context = LocalContext.current
    val allRdv by viewModel.allRendezVous.collectAsState()
    val eleves by viewModel.allEleves.collectAsState()

    var showAddModal by remember { mutableStateOf(false) }
    var selectedRdvForEdit by remember { mutableStateOf<RendezVousEntity?>(null) }

    var rdvASupprimer by remember { mutableStateOf<RendezVousEntity?>(null) }
    val dateFormat = SimpleDateFormat("EEEE dd MMMM yyyy", Locale.FRANCE)

    // À venir d'abord (du plus proche au plus lointain), puis les passés (du plus récent au plus ancien)
    val debutJour = remember { Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.timeInMillis }
    val rdvTries = remember(allRdv) {
        val (aVenir, passes) = allRdv.partition { it.dateEpochMs >= debutJour }
        aVenir.sortedBy { it.dateEpochMs } + passes.sortedByDescending { it.dateEpochMs }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Agenda (${allRdv.size})", fontWeight = FontWeight.Bold) },
                actions = { RaccourcisNavigation() },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddModal = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Ajouter Rendez-vous")
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
        ) {
            if (allRdv.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Event,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "Aucun rendez-vous prévu.",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(onClick = { showAddModal = true }) {
                            Text("Créer un rendez-vous")
                        }
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(top = 8.dp, bottom = 80.dp)
                ) {
                    items(rdvTries, key = { it.id }) { rdv ->
                        val estPasse = rdv.dateEpochMs < debutJour
                        Card(
                            modifier = Modifier.fillMaxWidth().then(if (estPasse) Modifier.alpha(0.55f) else Modifier),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = dateFormat.format(Date(rdv.dateEpochMs)).replaceFirstChar { it.uppercase() },
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = PrimaryBlue
                                    )
                                    IconButton(
                                        onClick = { rdvASupprimer = rdv },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = StatusRed)
                                    }
                                }

                                Spacer(modifier = Modifier.height(4.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Schedule,
                                        contentDescription = null,
                                        tint = SecondaryBlue,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "${rdv.heure} (${formatDuree(rdv.dureeHeures)}h) • ${rdv.nomEleve}",
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 15.sp
                                    )
                                }

                                Spacer(modifier = Modifier.height(4.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Default.Place,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = rdv.lieu,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                if (rdv.remarque.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "Remarque: ${rdv.remarque}",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddModal) {
        AddRendezVousDialog(
            eleves = eleves,
            onDismiss = { showAddModal = false },
            onSave = { nomEleve, dateMs, heure, duree, lieu, remarque, eleveId ->
                viewModel.addRendezVous(nomEleve, dateMs, heure, duree, lieu, remarque, eleveId)
                showAddModal = false
            }
        )
    }

    rdvASupprimer?.let { rdv ->
        AlertDialog(
            onDismissRequest = { rdvASupprimer = null },
            title = { Text("Supprimer ce rendez-vous ?") },
            text = { Text("${rdv.nomEleve} — ${dateFormat.format(Date(rdv.dateEpochMs))} à ${rdv.heure}") },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.deleteRendezVous(rdv)
                    rdvASupprimer = null
                }) { Text("Supprimer", color = StatusRed) }
            },
            dismissButton = { TextButton(onClick = { rdvASupprimer = null }) { Text("Annuler") } }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddRendezVousDialog(
    eleves: List<EleveEntity>,
    onDismiss: () -> Unit,
    onSave: (nomEleve: String, dateMs: Long, heure: String, duree: Float, lieu: String, remarque: String, eleveId: Int?) -> Unit
) {
    var selectedEleveName by remember { mutableStateOf(if (eleves.isNotEmpty()) "${eleves.first().prenom} ${eleves.first().nom}" else "") }
    var selectedEleveId by remember { mutableStateOf<Int?>(eleves.firstOrNull()?.id) }
    var customNom by remember { mutableStateOf("") }
    var heure by remember { mutableStateOf("16:00") }
    var dureeHeures by remember { mutableStateOf("2") }
    var lieu by remember { mutableStateOf("À domicile") }
    var remarque by remember { mutableStateOf("") }

    var dateEpochMs by remember { mutableStateOf(System.currentTimeMillis()) }
    var showDatePicker by remember { mutableStateOf(false) }

    var expandedDropdown by remember { mutableStateOf(false) }

    val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouveau Rendez-vous") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.verticalScroll(rememberScrollState())
            ) {
                if (eleves.isNotEmpty()) {
                    ExposedDropdownMenuBox(
                        expanded = expandedDropdown,
                        onExpandedChange = { expandedDropdown = !expandedDropdown }
                    ) {
                        OutlinedTextField(
                            value = selectedEleveName,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Sélectionner Élève / Groupe") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedDropdown) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor()
                        )
                        ExposedDropdownMenu(
                            expanded = expandedDropdown,
                            onDismissRequest = { expandedDropdown = false }
                        ) {
                            eleves.forEach { eleve ->
                                DropdownMenuItem(
                                    text = { Text("${eleve.prenom} ${eleve.nom} (${eleve.classe})") },
                                    onClick = {
                                        selectedEleveName = "${eleve.prenom} ${eleve.nom}"
                                        selectedEleveId = eleve.id
                                        expandedDropdown = false
                                    }
                                )
                            }
                        }
                    }
                } else {
                    OutlinedTextField(
                        value = customNom,
                        onValueChange = { customNom = it },
                        label = { Text("Nom Élève / Groupe") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = heure,
                        onValueChange = { heure = it },
                        label = { Text("Heure (ex: 16:00)") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = dureeHeures,
                        onValueChange = { dureeHeures = it },
                        label = { Text("Durée (h) [défaut 2h]") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                OutlinedTextField(
                    value = lieu,
                    onValueChange = { lieu = it },
                    label = { Text("Lieu (ex: A domicile, Centre)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = remarque,
                    onValueChange = { remarque = it },
                    label = { Text("Remarque / Objet") },
                    modifier = Modifier.fillMaxWidth()
                )

                // Correction : la date était toujours "aujourd'hui", sans possibilité de la changer
                OutlinedButton(onClick = { showDatePicker = true }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.CalendarMonth, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Date : ${dateFormat.format(Date(dateEpochMs))}")
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val finalNom = if (eleves.isNotEmpty()) selectedEleveName else customNom
                    val dureeFloat = dureeHeures.replace(',', '.').trim().toFloatOrNull() ?: 2.0f
                    if (finalNom.isNotBlank()) {
                        onSave(finalNom, dateEpochMs, heure, dureeFloat, lieu, remarque, selectedEleveId)
                    }
                }
            ) {
                Text("Enregistrer")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuler") }
        }
    )

    if (showDatePicker) {
        val pickerState = rememberDatePickerState(initialSelectedDateMillis = localVersUtc(dateEpochMs))
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { dateEpochMs = utcVersLocal(it) }
                    showDatePicker = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text("Annuler") } }
        ) {
            DatePicker(state = pickerState)
        }
    }
}

/** Le DatePicker travaille en minuit UTC : conversions vers/depuis le fuseau local. */
private fun localVersUtc(localMs: Long): Long {
    val local = Calendar.getInstance().apply { timeInMillis = localMs }
    return Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
        clear()
        set(local.get(Calendar.YEAR), local.get(Calendar.MONTH), local.get(Calendar.DAY_OF_MONTH))
    }.timeInMillis
}

private fun utcVersLocal(utcMs: Long): Long {
    val utc = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply { timeInMillis = utcMs }
    return Calendar.getInstance().apply {
        clear()
        set(utc.get(Calendar.YEAR), utc.get(Calendar.MONTH), utc.get(Calendar.DAY_OF_MONTH))
    }.timeInMillis
}
