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
import androidx.compose.ui.platform.LocalContext
import android.widget.Toast
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
                    text = { Text("Appel du jour", fontWeight = FontWeight.SemiBold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Historique (${seances.size})", fontWeight = FontWeight.SemiBold) }
                )
            }

            when (selectedTab) {
                0 -> AppelDuJour(viewModel)
                1 -> SeanceHistorySection(seances = seances)
            }
        }
    }
}

/**
 * Appel du jour : un seul appel par groupe et par jour. Une fois validé, il est verrouillé.
 * Correction possible uniquement le jour même, avec le code d'accès.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AppelDuJour(viewModel: ProfViewModel) {
    val context = LocalContext.current
    val eleves by viewModel.allEleves.collectAsState()
    val groupes by viewModel.allGroupes.collectAsState()
    val seancesDuJour by viewModel.seancesAujourdhui.collectAsState()
    val settings by viewModel.settings.collectAsState()

    fun memeNom(a: String?, b: String) = a != null && a.trim().equals(b.trim(), ignoreCase = true)
    val jour = remember { SimpleDateFormat("EEEE", Locale.FRANCE).format(Date()) }
    val sansGroupe = eleves.filter { e -> groupes.none { memeNom(e.groupe, it.nom) } }
    // "" = élèves sans groupe
    val choix: List<Pair<String, String>> = groupes.map { it.nom to it.nom } + (if (sansGroupe.isNotEmpty()) listOf("" to "Sans groupe") else emptyList())
    var groupe by remember {
        mutableStateOf(groupes.firstOrNull { it.jourSemaine.equals(jour, ignoreCase = true) }?.nom ?: choix.firstOrNull()?.first ?: "")
    }
    val cfg = groupes.firstOrNull { it.nom == groupe }
    var heure by remember(groupe) { mutableStateOf(cfg?.heureDebut ?: "16:00") }
    var dureeHeures by remember { mutableStateOf(com.example.util.formatDuree(settings.dureeParDefautHeures)) }
    val statuts = remember(groupe) { mutableStateMapOf<Int, String>() }
    var corriger by remember { mutableStateOf(false) }

    val elevesGroupe = (if (groupe.isEmpty()) sansGroupe else eleves.filter { memeNom(it.groupe, groupe) }).sortedBy { it.nom + it.prenom }
    val dejaFait = seancesDuJour.filter { if (groupe.isEmpty()) it.groupeCache.isBlank() else memeNom(it.groupeCache, groupe) }
    fun st(id: Int) = statuts[id] ?: "P"
    val p = elevesGroupe.count { st(it.id) == "P" }
    val a = elevesGroupe.count { st(it.id) == "A" }
    val r = elevesGroupe.count { st(it.id) == "R" }

    if (eleves.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
            Text("Ajoutez d'abord des élèves.")
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Text(SimpleDateFormat("EEEE d MMMM yyyy", Locale.FRANCE).format(Date()).replaceFirstChar { it.uppercase() }, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                choix.forEach { (cle, libelle) ->
                    val fait = seancesDuJour.any { if (cle.isEmpty()) it.groupeCache.isBlank() else memeNom(it.groupeCache, cle) }
                    FilterChip(selected = groupe == cle, onClick = { groupe = cle }, label = { Text((if (fait) "✓ " else "") + libelle) })
                }
            }
        }

        if (dejaFait.isNotEmpty()) {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = StatusGreenBg)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = StatusGreen)
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text("Appel déjà validé aujourd'hui", fontWeight = FontWeight.Bold, color = StatusGreen)
                            Text("Il est verrouillé : inutile de le refaire.", fontSize = 12.sp, color = StatusGreen)
                        }
                    }
                }
            }
            items(dejaFait, key = { it.id }) { s ->
                val (libelle, couleur) = when (s.statut) {
                    "P" -> "Présent" to StatusGreen
                    "A" -> "Absent" to StatusRed
                    else -> "Retard" to StatusOrange
                }
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(s.nomEleveCache, fontWeight = FontWeight.SemiBold)
                            Text("${s.heure} · ${com.example.util.formatDuree(s.dureeHeures)} h", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text(libelle, color = couleur, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }
            item {
                TextButton(onClick = { corriger = true }) { Text("Corriger l'appel d'aujourd'hui (code requis)") }
            }
        } else if (elevesGroupe.isEmpty()) {
            item { Text("Aucun élève dans ce groupe.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        } else {
            item {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text("P : $p", color = StatusGreen, fontWeight = FontWeight.Bold)
                            Text("A : $a", color = StatusRed, fontWeight = FontWeight.Bold)
                            Text("R : $r", color = StatusOrange, fontWeight = FontWeight.Bold)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = heure, onValueChange = { heure = it }, label = { Text("Heure") }, singleLine = true, modifier = Modifier.weight(1f))
                            OutlinedTextField(value = dureeHeures, onValueChange = { dureeHeures = it }, label = { Text("Durée (h)") }, singleLine = true, modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
            items(elevesGroupe, key = { it.id }) { eleve ->
                AttendanceStudentRow(eleve = eleve, statut = st(eleve.id), onStatutChanged = { statuts[eleve.id] = it })
            }
            item {
                Button(
                    onClick = {
                        val maintenant = System.currentTimeMillis()
                        val duree = dureeHeures.replace(',', '.').trim().toFloatOrNull() ?: settings.dureeParDefautHeures
                        viewModel.enregistrerPresencesBatch(elevesGroupe.map { e ->
                            SeanceEntity(
                                eleveId = e.id,
                                dateEpochMs = maintenant,
                                heure = heure.trim(),
                                dureeHeures = duree,
                                statut = st(e.id),
                                nomEleveCache = "${e.prenom} ${e.nom}",
                                groupeCache = groupe
                            )
                        })
                        Toast.makeText(context, "Appel enregistré et verrouillé", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue)
                ) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Valider l'appel (${elevesGroupe.size})", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    if (corriger) {
        DemandeCodeDialog(
            titre = "Corriger l'appel ?",
            message = "L'appel de ce groupe pour aujourd'hui sera rouvert pour être refait. Les compteurs de séances seront rétablis.",
            libelle = "Rouvrir l'appel",
            verifier = { viewModel.verifierCode(it) },
            onValide = { viewModel.annulerAppelDuJour(groupe) },
            onDismiss = { corriger = false }
        )
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
fun SeanceHistorySection(seances: List<SeanceEntity>) {
    val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)
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
            item {
                Text("🔒 Historique verrouillé : les séances passées ne peuvent plus être modifiées.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
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
                    }
                }
            }
        }
    }
}

private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()
