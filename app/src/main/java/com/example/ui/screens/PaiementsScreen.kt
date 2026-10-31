package com.example.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.PaiementEntity
import com.example.ui.theme.*
import com.example.ui.navigation.RaccourcisNavigation
import com.example.ui.viewmodel.ProfViewModel
import com.example.util.formatMontant
import com.example.util.remplirModele
import com.example.util.CommunicationHelper
import androidx.compose.ui.platform.LocalContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaiementsScreen(viewModel: ProfViewModel) {
    val paiements by viewModel.allPaiements.collectAsState()
    val elevesPaiementEnAttente by viewModel.elevesPaiementEnAttente.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val context = LocalContext.current

    var selectedEleveForPayment by remember { mutableStateOf<EleveEntity?>(null) }
    var selectedTab by remember { mutableIntStateOf(0) } // 0: À réclamer, 1: Historique

    val totalEncaisse = paiements.sumOf { it.montant }
    // Un élève peut devoir plusieurs forfaits (ex. 8 séances avec un forfait de 4)
    val limite = settings.seancesParPaiement.coerceAtLeast(1)
    val totalEnAttente = elevesPaiementEnAttente.sumOf { (_, count) -> (count / limite) * settings.tarifForfait }

    val dateFormat = SimpleDateFormat("dd/MM/yyyy • HH:mm", Locale.FRANCE)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Paiements", fontWeight = FontWeight.Bold) },
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
            // Stats Banner
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Recette Encaissée",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = "${formatMontant(totalEncaisse)} ${settings.devise}",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = StatusGreen
                        )
                    }
                    Divider(
                        modifier = Modifier
                            .height(40.dp)
                            .width(1.dp)
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Somme Attendu",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = "${formatMontant(totalEnAttente)} ${settings.devise}",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (totalEnAttente > 0) StatusRed else StatusGreen
                        )
                    }
                }
            }

            // Tabs
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("⚠️ Attendu (${elevesPaiementEnAttente.size})") }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("📜 Historique (${paiements.size})") }
                )
            }

            when (selectedTab) {
                0 -> {
                    if (elevesPaiementEnAttente.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = StatusGreen,
                                    modifier = Modifier.size(56.dp)
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = "Tous les paiements sont à jour !",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp
                                )
                            }
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(elevesPaiementEnAttente) { (eleve, count) ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = StatusRedBg)
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = "${eleve.prenom} ${eleve.nom}",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 16.sp,
                                                color = StatusRed
                                            )
                                            Text(
                                                text = "Classe: ${eleve.classe} • Séances: $count / ${settings.seancesParPaiement}",
                                                fontSize = 13.sp,
                                                color = StatusRed
                                            )
                                            Text(
                                                text = "Forfait à régler : ${formatMontant(settings.tarifForfait)} ${settings.devise}" + if (count / limite > 1) " (×${count / limite})" else "",
                                                fontWeight = FontWeight.SemiBold,
                                                fontSize = 13.sp
                                            )
                                        }

                                        Column(horizontalAlignment = Alignment.End) {
                                            Button(
                                                onClick = { selectedEleveForPayment = eleve },
                                                colors = ButtonDefaults.buttonColors(containerColor = StatusGreen)
                                            ) {
                                                Icon(Icons.Default.Payments, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Paiement Reçu")
                                            }
                                            TextButton(onClick = {
                                                val msg = remplirModele(
                                                    settings.smsTemplatePaiement, eleve.prenom, eleve.nom, eleve.classe, "",
                                                    formatMontant(settings.tarifForfait), settings.devise
                                                )
                                                CommunicationHelper.envoyerWhatsapp(context, eleve.telephone, msg)
                                            }) {
                                                Icon(Icons.Default.Chat, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Rappel", fontSize = 12.sp)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                1 -> {
                    if (paiements.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(32.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Aucun paiement enregistré pour l'instant.")
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(paiements, key = { it.id }) { paiement ->
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
                                                text = paiement.nomEleveCache,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 15.sp
                                            )
                                            Text(
                                                text = "${dateFormat.format(Date(paiement.dateEpochMs))} • ${paiement.modePaiement}",
                                                fontSize = 12.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                            if (paiement.observation.isNotBlank()) {
                                                Text(
                                                    text = "Obs: ${paiement.observation}",
                                                    fontSize = 12.sp,
                                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                                )
                                            }
                                        }

                                        Text(
                                            text = "+${formatMontant(paiement.montant)} ${settings.devise}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 16.sp,
                                            color = StatusGreen
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (selectedEleveForPayment != null) {
        val eleve = selectedEleveForPayment!!
        EnregistrerPaiementDialog(
            eleve = eleve,
            defaultMontant = settings.tarifForfait,
            devise = settings.devise,
            defaultSeances = settings.seancesParPaiement,
            onDismiss = { selectedEleveForPayment = null },
            onConfirm = { montant, mode, obs ->
                viewModel.marquerPaiementRecu(
                    eleveId = eleve.id,
                    nomEleve = "${eleve.prenom} ${eleve.nom}",
                    montant = montant,
                    modePaiement = mode,
                    nbSeances = settings.seancesParPaiement,
                    observation = obs
                )
                selectedEleveForPayment = null
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun EnregistrerPaiementDialog(
    eleve: EleveEntity,
    defaultMontant: Double,
    devise: String,
    defaultSeances: Int,
    onDismiss: () -> Unit,
    onConfirm: (montant: Double, mode: String, obs: String) -> Unit
) {
    var montantText by remember { mutableStateOf(formatMontant(defaultMontant)) }
    var selectedMode by remember { mutableStateOf("Espèces") }
    var observation by remember { mutableStateOf("") }

    val modesList = listOf("Espèces", "Virement", "Carte", "Chèque")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Valider Paiement - ${eleve.prenom} ${eleve.nom}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Séances effectuées : ${eleve.sessionsInCurrentCycle}. Ce paiement règle $defaultSeances séance(s)" +
                        " ; il en restera ${(eleve.sessionsInCurrentCycle - defaultSeances).coerceAtLeast(0)} à payer.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = montantText,
                    onValueChange = { montantText = it },
                    label = { Text("Montant ($devise)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Mode de paiement :", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                FlowRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    modesList.forEach { mode ->
                        FilterChip(
                            selected = selectedMode == mode,
                            onClick = { selectedMode = mode },
                            label = { Text(mode, fontSize = 12.sp) }
                        )
                    }
                }

                OutlinedTextField(
                    value = observation,
                    onValueChange = { observation = it },
                    label = { Text("Observation (Facultative)") },
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val m = montantText.replace(',', '.').trim().toDoubleOrNull() ?: defaultMontant
                    onConfirm(m, selectedMode, observation)
                },
                colors = ButtonDefaults.buttonColors(containerColor = StatusGreen)
            ) {
                Text("Valider le paiement")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuler") }
        }
    )
}
