package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.SeanceEntity
import com.example.ui.theme.*
import com.example.ui.navigation.RaccourcisNavigation
import com.example.ui.viewmodel.ProfViewModel
import com.example.util.formatDuree
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeancesScreen(viewModel: ProfViewModel) {
    val seances by viewModel.allSeances.collectAsState()
    val eleves by viewModel.allEleves.collectAsState()

    var selectedTab by remember { mutableIntStateOf(0) } // 0: Présences Rapides (Faire l'appel), 1: Historique des séances

    val dateFormat = SimpleDateFormat("EEEE dd MMMM yyyy", Locale.FRANCE)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Séances", fontWeight = FontWeight.Bold) },
                actions = { RaccourcisNavigation() },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Tab Selector
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("📋 Appel / Présences", fontWeight = FontWeight.SemiBold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("📖 Historique (${seances.size})", fontWeight = FontWeight.SemiBold) }
                )
            }

            when (selectedTab) {
                0 -> QuickAppelSection(eleves = eleves, onSaveBatch = { batch -> viewModel.enregistrerPresencesBatch(batch) })
                1 -> SeanceHistorySection(seances = seances, onDelete = { viewModel.deleteSeance(it) })
            }
        }
    }
}

@Composable
fun QuickAppelSection(
    eleves: List<EleveEntity>,
    onSaveBatch: (List<SeanceEntity>) -> Unit
) {
    var heure by remember { mutableStateOf("16:00") }
    var dureeHeures by remember { mutableStateOf("2") }
    var selectedGroupFilter by remember { mutableStateOf("Tous") }

    // Map of eleveId -> Statut ("P", "A", "R")
    val attendanceMap = remember { mutableStateMapOf<Int, String>() }
    // Initialize default to "P" for all students
    LaunchedEffect(eleves) {
        eleves.forEach { e ->
            if (!attendanceMap.containsKey(e.id)) {
                attendanceMap[e.id] = "P"
            }
        }
    }

    val availableGroups = remember(eleves) {
        listOf("Tous") + eleves.mapNotNull { it.groupe }.filter { it.isNotBlank() }.distinct()
    }

    val filteredEleves = remember(eleves, selectedGroupFilter) {
        if (selectedGroupFilter == "Tous") eleves
        else eleves.filter { it.groupe == selectedGroupFilter }
    }

    var showSuccessToast by remember { mutableStateOf(false) }

    // Correction : les statistiques comptaient tous les élèves, pas seulement le groupe affiché
    val statutsAffiches = filteredEleves.map { attendanceMap[it.id] ?: "P" }
    val pCount = statutsAffiches.count { it == "P" }
    val aCount = statutsAffiches.count { it == "A" }
    val rCount = statutsAffiches.count { it == "R" }
    val totalCount = statutsAffiches.size
    val presenceRate = if (totalCount > 0) ((pCount + rCount).toFloat() / totalCount * 100).toInt() else 0

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Attendance Live Summary Banner
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Session d'Aujourd'hui", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    Text("Taux de présence : $presenceRate%", fontWeight = FontWeight.Bold, color = PrimaryBlue)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    Text("P (Présents) : $pCount", color = StatusGreen, fontWeight = FontWeight.Bold)
                    Text("A (Absents) : $aCount", color = StatusRed, fontWeight = FontWeight.Bold)
                    Text("R (Retards) : $rCount", color = StatusOrange, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = heure,
                onValueChange = { heure = it },
                label = { Text("Heure") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
            OutlinedTextField(
                value = dureeHeures,
                onValueChange = { dureeHeures = it },
                label = { Text("Durée (heures)") },
                modifier = Modifier.weight(1f),
                singleLine = true
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (availableGroups.size > 1) {
            ScrollableTabRow(
                selectedTabIndex = availableGroups.indexOf(selectedGroupFilter).coerceAtLeast(0),
                edgePadding = 0.dp
            ) {
                availableGroups.forEach { group ->
                    Tab(
                        selected = selectedGroupFilter == group,
                        onClick = { selectedGroupFilter = group; showSuccessToast = false },
                        text = { Text(group) }
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        if (eleves.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Text("Aucun élève enregistré. Ajoutez d'abord des élèves dans l'onglet 'Élèves'.")
            }
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filteredEleves, key = { it.id }) { eleve ->
                    val currentStatut = attendanceMap[eleve.id] ?: "P"
                    AttendanceStudentRow(
                        eleve = eleve,
                        statut = currentStatut,
                        onStatutChanged = { newStatut ->
                            attendanceMap[eleve.id] = newStatut
                            showSuccessToast = false
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = {
                    val nowMs = System.currentTimeMillis()
                    val duree = dureeHeures.replace(',', '.').trim().toFloatOrNull() ?: 2.0f
                    val listToSave = filteredEleves.map { eleve ->
                        SeanceEntity(
                            eleveId = eleve.id,
                            dateEpochMs = nowMs,
                            heure = heure,
                            dureeHeures = duree,
                            statut = attendanceMap[eleve.id] ?: "P",
                            nomEleveCache = "${eleve.prenom} ${eleve.nom}",
                            groupeCache = eleve.groupe ?: ""
                        )
                    }
                    onSaveBatch(listToSave)
                    showSuccessToast = true
                },
                // Évite d'enregistrer deux fois le même appel (double appui)
                enabled = !showSuccessToast && filteredEleves.isNotEmpty(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue)
            ) {
                Icon(Icons.Default.CheckCircle, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Valider et Enregistrer l'Appel (${filteredEleves.size})", fontWeight = FontWeight.Bold)
            }

            AnimatedVisibility(visible = showSuccessToast) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = StatusGreenBg),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "✅ Appel enregistré avec succès !",
                            color = StatusGreen,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Les compteurs de séances des élèves présents ont été mis à jour.",
                            fontSize = 12.sp,
                            color = StatusGreen
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AttendanceStudentRow(
    eleve: EleveEntity,
    statut: String,
    onStatutChanged: (String) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${eleve.prenom} ${eleve.nom}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )
                Text(
                    text = "${eleve.classe} ${if (!eleve.groupe.isNull_or_empty()) "(${eleve.groupe})" else ""}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                // P - Present (Green)
                StatutToggleButton(
                    label = "P",
                    description = "Présent",
                    selected = statut == "P",
                    selectedColor = StatusGreen,
                    unselectedColor = Color.LightGray,
                    onClick = { onStatutChanged("P") }
                )
                // A - Absent (Red)
                StatutToggleButton(
                    label = "A",
                    description = "Absent",
                    selected = statut == "A",
                    selectedColor = StatusRed,
                    unselectedColor = Color.LightGray,
                    onClick = { onStatutChanged("A") }
                )
                // R - Retard (Orange)
                StatutToggleButton(
                    label = "R",
                    description = "Retard",
                    selected = statut == "R",
                    selectedColor = StatusOrange,
                    unselectedColor = Color.LightGray,
                    onClick = { onStatutChanged("R") }
                )
            }
        }
    }
}

@Composable
fun StatutToggleButton(
    label: String,
    description: String,
    selected: Boolean,
    selectedColor: Color,
    unselectedColor: Color,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(38.dp)
            .clip(CircleShape)
            .background(if (selected) selectedColor else unselectedColor.copy(alpha = 0.2f))
            .border(1.dp, if (selected) selectedColor else unselectedColor, CircleShape)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            fontWeight = FontWeight.Bold,
            color = if (selected) Color.White else Color.DarkGray,
            fontSize = 15.sp
        )
    }
}

@Composable
fun SeanceHistorySection(
    seances: List<SeanceEntity>,
    onDelete: (SeanceEntity) -> Unit
) {
    val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)
    var seanceASupprimer by remember { mutableStateOf<SeanceEntity?>(null) }

    seanceASupprimer?.let { seance ->
        AlertDialog(
            onDismissRequest = { seanceASupprimer = null },
            title = { Text("Supprimer cette séance ?") },
            text = { Text("${seance.nomEleveCache} — ${dateFormat.format(Date(seance.dateEpochMs))}. Le compteur de séances de l'élève sera corrigé.") },
            confirmButton = {
                TextButton(onClick = { onDelete(seance); seanceASupprimer = null }) { Text("Supprimer", color = StatusRed) }
            },
            dismissButton = { TextButton(onClick = { seanceASupprimer = null }) { Text("Annuler") } }
        )
    }

    if (seances.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Text("Aucune séance enregistrée dans l'historique.", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(seances, key = { it.id }) { seance ->
                val (statusLabel, statusColor) = when (seance.statut) {
                    "P" -> Pair("Présent (P)", StatusGreen)
                    "A" -> Pair("Absent (A)", StatusRed)
                    "R" -> Pair("Retard (R)", StatusOrange)
                    else -> Pair(seance.statut, PrimaryBlue)
                }

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = seance.nomEleveCache,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                            Text(
                                text = "${dateFormat.format(Date(seance.dateEpochMs))} à ${seance.heure} • Durée : ${formatDuree(seance.dureeHeures)}h",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        Badge(
                            containerColor = statusColor.copy(alpha = 0.15f),
                            contentColor = statusColor
                        ) {
                            Text(
                                text = statusLabel,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }

                        IconButton(onClick = { seanceASupprimer = seance }) {
                            Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = MaterialTheme.colorScheme.outline)
                        }
                    }
                }
            }
        }
    }
}

private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()
