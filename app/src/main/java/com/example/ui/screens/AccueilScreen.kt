package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.RendezVousEntity
import com.example.data.local.entity.SeanceEntity
import com.example.ui.theme.*
import com.example.ui.navigation.RaccourcisNavigation
import com.example.ui.viewmodel.ProfViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccueilScreen(
    viewModel: ProfViewModel,
    onNavigateToEleves: () -> Unit,
    onNavigateToRendezVous: () -> Unit,
    onNavigateToSeances: () -> Unit,
    onNavigateToPaiements: () -> Unit,
    onAddEleveClick: () -> Unit
) {
    val eleves by viewModel.allEleves.collectAsState()
    val allGroupes by viewModel.allGroupes.collectAsState()
    val seancesToday by viewModel.seancesAujourdhui.collectAsState()
    val rdvToday by viewModel.rendezVousAujourdhui.collectAsState()
    val paiementsEnAttente by viewModel.elevesPaiementEnAttente.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current

    val dateFormat = SimpleDateFormat("EEEE d MMMM yyyy", Locale.FRANCE)
    val todayStr = dateFormat.format(Date()).replaceFirstChar { it.uppercase() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Tableau de Bord",
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp
                        )
                        Text(
                            text = todayStr,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onAddEleveClick) {
                        Icon(
                            imageVector = Icons.Default.PersonAdd,
                            contentDescription = "Ajouter Élève",
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                    RaccourcisNavigation()
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onAddEleveClick,
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Ajouter un élève") },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(bottom = 88.dp) // ne pas masquer le dernier élément sous le bouton flottant
        ) {
            item { Spacer(modifier = Modifier.height(8.dp)) }

            // KPI Grid Cards
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            title = "Total Élèves",
                            value = "${eleves.size}",
                            icon = Icons.Default.School,
                            color = PrimaryBlue,
                            modifier = Modifier.weight(1f),
                            onClick = onNavigateToEleves
                        )
                        StatCard(
                            title = "Séances aujourd'hui",
                            value = "${seancesToday.size}",
                            icon = Icons.Default.MenuBook,
                            color = SecondaryBlue,
                            modifier = Modifier.weight(1f),
                            onClick = onNavigateToSeances
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StatCard(
                            title = "Paiements en attente",
                            value = "${paiementsEnAttente.size}",
                            icon = Icons.Default.Payments,
                            color = if (paiementsEnAttente.isNotEmpty()) StatusRed else StatusGreen,
                            modifier = Modifier.weight(1f),
                            onClick = onNavigateToPaiements
                        )
                        StatCard(
                            title = "Rendez-vous aujourd'hui",
                            value = "${rdvToday.size}",
                            icon = Icons.Default.Event,
                            color = StatusOrange,
                            modifier = Modifier.weight(1f),
                            onClick = onNavigateToRendezVous
                        )
                    }
                }
            }

            // Section Rappel des Séances de Groupe & Auto-Programmation (Exigence #3)
            if (allGroupes.isNotEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.NotificationsActive, contentDescription = null, tint = PrimaryBlue, modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text("Rappel Prochaines Séances de Groupe", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = PrimaryBlue)
                                    Text("Programmation automatique & alarme de rappel", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            Spacer(modifier = Modifier.height(10.dp))

                            allGroupes.forEach { groupe ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(groupe.nom, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text("Créneau : Chaque ${groupe.jourSemaine} à ${groupe.heureDebut}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Button(
                                        onClick = {
                                            viewModel.programmerProchaineSeanceGroupe(groupe)
                                            android.widget.Toast.makeText(
                                                context,
                                                "Prochaine séance de ${groupe.nom} ajoutée à l'agenda (rappel 1 h avant)",
                                                android.widget.Toast.LENGTH_SHORT
                                            ).show()
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                    ) {
                                        Icon(Icons.Default.EventRepeat, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Auto-Programmer", fontSize = 11.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Alert Section for Pending Payments
            if (paiementsEnAttente.isNotEmpty()) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = StatusRedBg),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onNavigateToPaiements() },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .padding(16.dp)
                                .fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = null,
                                tint = StatusRed,
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Attention : ${paiementsEnAttente.size} paiement(s) attendu(s) !",
                                    fontWeight = FontWeight.Bold,
                                    color = StatusRed
                                )
                                Text(
                                    text = "Certains élèves ont atteint leurs ${settings.seancesParPaiement} séances.",
                                    fontSize = 12.sp,
                                    color = StatusRed
                                )
                            }
                            Icon(
                                imageVector = Icons.Default.ArrowForwardIos,
                                contentDescription = null,
                                tint = StatusRed,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            // Today's Appointments Section
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Rendez-vous du jour",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    TextButton(onClick = onNavigateToRendezVous) {
                        Text("Voir tout")
                    }
                }
            }

            if (rdvToday.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "Aucun rendez-vous prévu aujourd'hui.",
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }
            } else {
                items(rdvToday) { rdv ->
                    RdvItemRow(rdv = rdv)
                }
            }

            // Quick Students Overview
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Mes Élèves (${eleves.size})",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    TextButton(onClick = onNavigateToEleves) {
                        Text("Voir tout")
                    }
                }
            }

            if (eleves.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.School,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(40.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Aucun élève enregistré pour le moment.",
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "Cliquez sur 'Ajouter un élève' pour commencer.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            } else {
                items(eleves.take(5)) { eleve ->
                    EleveQuickRow(eleve = eleve, limitCycle = settings.seancesParPaiement, onClick = onNavigateToEleves)
                }
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
fun StatCard(
    title: String,
    value: String,
    icon: ImageVector,
    color: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f)),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(color.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(imageVector = icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = value,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = title,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun RdvItemRow(rdv: RendezVousEntity) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(PrimaryBlue.copy(alpha = 0.1f))
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = rdv.heure,
                    fontWeight = FontWeight.Bold,
                    color = PrimaryBlue,
                    fontSize = 13.sp
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = rdv.nomEleve,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp
                )
                Text(
                    text = "${rdv.lieu} • Durée : ${com.example.util.formatDuree(rdv.dureeHeures)}h",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
fun EleveQuickRow(eleve: EleveEntity, limitCycle: Int = 4, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(PrimaryBlue.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "${eleve.prenom.take(1)}${eleve.nom.take(1)}".uppercase(),
                    fontWeight = FontWeight.Bold,
                    color = PrimaryBlue
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${eleve.prenom} ${eleve.nom}",
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "Classe: ${eleve.classe} • Tél: ${eleve.telephone}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Badge(
                containerColor = if (eleve.sessionsInCurrentCycle >= limitCycle) StatusRed else StatusGreenBg,
                contentColor = if (eleve.sessionsInCurrentCycle >= limitCycle) Color.White else StatusGreen
            ) {
                Text(
                    text = "${eleve.sessionsInCurrentCycle}/$limitCycle",
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}
