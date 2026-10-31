package com.example.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.PaiementEntity
import com.example.data.local.entity.SettingsEntity
import com.example.ui.theme.*
import com.example.ui.navigation.RaccourcisNavigation
import com.example.ui.viewmodel.ProfViewModel
import com.example.util.CommunicationHelper
import com.example.util.formatMontant
import com.example.util.libelleCycle
import com.example.util.remplirModele
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaiementsScreen(viewModel: ProfViewModel) {
    val context = LocalContext.current
    val paiements by viewModel.allPaiements.collectAsState()
    val eleves by viewModel.allEleves.collectAsState()
    val elevesPaiementEnAttente by viewModel.elevesPaiementEnAttente.collectAsState()
    val settings by viewModel.settings.collectAsState()

    val groupes by viewModel.allGroupes.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) } // 0 : par groupe, 1 : en retard, 2 : historique
    var filtreHisto by remember { mutableStateOf("") }
    var choixEleve by remember { mutableStateOf(false) }
    var eleveAPayer by remember { mutableStateOf<EleveEntity?>(null) }
    var paiementAModifier by remember { mutableStateOf<PaiementEntity?>(null) }
    var paiementASupprimer by remember { mutableStateOf<PaiementEntity?>(null) }

    val limite = settings.seancesParPaiement.coerceAtLeast(1)
    val totalEncaisse = paiements.filter { it.estEncaisse }.sumOf { it.montant }
    val totalNonEncaisse = paiements.filter { !it.estEncaisse }.sumOf { it.montant }
    val totalAttendu = elevesPaiementEnAttente.sumOf { (_, count) -> (count / limite) * settings.tarifForfait }
    val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Paiements", fontWeight = FontWeight.Bold) },
                actions = { RaccourcisNavigation() },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            if (eleves.isNotEmpty()) {
                ExtendedFloatingActionButton(
                    onClick = { choixEleve = true },
                    icon = { Icon(Icons.Default.Add, contentDescription = null) },
                    text = { Text("Encaisser") },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            }
        }
    ) { innerPadding ->
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Montant("Encaissé", totalEncaisse, settings.devise, StatusGreen, Modifier.weight(1f))
                Montant("Non encaissé", totalNonEncaisse, settings.devise, StatusOrange, Modifier.weight(1f))
                Montant("À réclamer", totalAttendu, settings.devise, if (totalAttendu > 0) StatusRed else StatusGreen, Modifier.weight(1f))
            }

            TabRow(selectedTabIndex = selectedTab) {
                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Par groupe", maxLines = 1) })
                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("En retard (${elevesPaiementEnAttente.size})", maxLines = 1) })
                Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }, text = { Text("Historique", maxLines = 1) })
            }

            if (selectedTab == 0) {
                EncaisserParGroupe(
                    groupes = groupes,
                    eleves = eleves,
                    paiements = paiements,
                    settings = settings,
                    onEncaisser = { eleveAPayer = it }
                )
            } else if (selectedTab == 1) {
                if (elevesPaiementEnAttente.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = StatusGreen, modifier = Modifier.size(56.dp))
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Tous les paiements sont à jour !", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text("Bouton « Encaisser » pour un paiement à l'avance.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 96.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(elevesPaiementEnAttente, key = { it.first.id }) { (eleve, count) ->
                            val nbForfaits = (count / limite).coerceAtLeast(1)
                            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                                Row(modifier = Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("${eleve.prenom} ${eleve.nom}", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                        Text("${eleve.classe} · $count séances faites non payées", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text(
                                            "À régler : ${formatMontant(settings.tarifForfait * nbForfaits)} ${settings.devise}" + if (nbForfaits > 1) " ($nbForfaits forfaits)" else "",
                                            fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = StatusRed
                                        )
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Button(onClick = { eleveAPayer = eleve }, colors = ButtonDefaults.buttonColors(containerColor = StatusGreen)) {
                                            Icon(Icons.Default.Payments, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Reçu")
                                        }
                                        TextButton(onClick = {
                                            val msg = remplirModele(
                                                settings.smsTemplatePaiement, eleve.prenom, eleve.nom, eleve.classe, "",
                                                formatMontant(settings.tarifForfait * nbForfaits), settings.devise
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
            } else {
                if (paiements.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text("Aucun paiement enregistré pour l'instant.")
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 96.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        item {
                            OutlinedTextField(
                                value = filtreHisto,
                                onValueChange = { filtreHisto = it },
                                placeholder = { Text("Filtrer par élève…") },
                                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        items(paiements.filter { filtreHisto.isBlank() || it.nomEleveCache.contains(filtreHisto.trim(), ignoreCase = true) }, key = { it.id }) { p ->
                            Card(
                                modifier = Modifier.fillMaxWidth().clickable { paiementAModifier = p },
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                            ) {
                                Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(p.nomEleveCache, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(
                                            "Payé le ${dateFormat.format(Date(p.dateEpochMs))} · ${p.nbSeancesReglees} séance${if (p.nbSeancesReglees > 1) "s" else ""} · ${p.modePaiement}",
                                            fontSize = 12.sp
                                        )
                                        if (p.observation.isNotBlank()) {
                                            Text(p.observation, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2)
                                        }
                                        if (!p.estEncaisse) {
                                            AssistChip(
                                                onClick = { viewModel.modifierPaiement(p.copy(estEncaisse = true)) },
                                                label = { Text("Non encaissé · marquer encaissé", fontSize = 11.sp) },
                                                leadingIcon = { Icon(Icons.Default.HourglassEmpty, contentDescription = null, modifier = Modifier.size(16.dp), tint = StatusOrange) }
                                            )
                                        }
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(
                                            "+${formatMontant(p.montant)} ${settings.devise}",
                                            fontWeight = FontWeight.Bold, fontSize = 16.sp,
                                            color = if (p.estEncaisse) StatusGreen else StatusOrange
                                        )
                                        Icon(Icons.Default.Edit, contentDescription = "Modifier", modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (choixEleve) {
        AlertDialog(
            onDismissRequest = { choixEleve = false },
            title = { Text("Encaisser un paiement") },
            text = {
                Column(modifier = Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState())) {
                    Text("Choisissez l'élève (y compris pour un paiement à l'avance) :", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(8.dp))
                    eleves.sortedBy { it.nom + it.prenom }.forEach { e ->
                        Row(
                            modifier = Modifier.fillMaxWidth().clickable { choixEleve = false; eleveAPayer = e }.padding(vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("${e.prenom} ${e.nom}", fontWeight = FontWeight.SemiBold)
                                Text(e.classe, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(libelleCycle(e.sessionsInCurrentCycle, limite), fontSize = 12.sp, color = PrimaryBlue)
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { choixEleve = false }) { Text("Annuler") } }
        )
    }

    eleveAPayer?.let { eleve ->
        PaiementDialog(
            titre = "Paiement — ${eleve.prenom} ${eleve.nom}",
            seancesDues = eleve.sessionsInCurrentCycle,
            settings = settings,
            initial = null,
            onDismiss = { eleveAPayer = null },
            onConfirm = { montant, mode, nb, obs, encaisse ->
                viewModel.marquerPaiementRecu(eleve.id, "${eleve.prenom} ${eleve.nom}", montant, mode, nb, obs, encaisse)
                eleveAPayer = null
            }
        )
    }

    paiementAModifier?.let { p ->
        val eleve = eleves.firstOrNull { it.id == p.eleveId }
        PaiementDialog(
            titre = "Modifier le versement — ${p.nomEleveCache}",
            // Séances dues avant ce versement = dues actuelles + séances déjà réglées par ce versement
            seancesDues = (eleve?.sessionsInCurrentCycle ?: 0) + p.nbSeancesReglees,
            settings = settings,
            initial = p,
            onDismiss = { paiementAModifier = null },
            onDelete = { paiementAModifier = null; paiementASupprimer = p },
            onConfirm = { montant, mode, nb, obs, encaisse ->
                viewModel.modifierPaiement(p.copy(montant = montant, modePaiement = mode, nbSeancesReglees = nb, observation = obs, estEncaisse = encaisse))
                paiementAModifier = null
            }
        )
    }

    paiementASupprimer?.let { p ->
        AlertDialog(
            onDismissRequest = { paiementASupprimer = null },
            title = { Text("Annuler ce versement ?") },
            text = { Text("${p.nomEleveCache} — ${formatMontant(p.montant)} ${settings.devise}. Les ${p.nbSeancesReglees} séance(s) réglée(s) redeviendront à payer.") },
            confirmButton = {
                TextButton(onClick = { viewModel.supprimerPaiement(p); paiementASupprimer = null }) { Text("Annuler le versement", color = StatusRed) }
            },
            dismissButton = { TextButton(onClick = { paiementASupprimer = null }) { Text("Retour") } }
        )
    }
}

@Composable
private fun Montant(titre: String, valeur: Double, devise: String, couleur: androidx.compose.ui.graphics.Color, modifier: Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(titre, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
            Text(formatMontant(valeur), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = couleur, maxLines = 1)
            Text(devise, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/**
 * Saisie ou modification d'un versement : nombre de séances payées (ex. 8 pour deux forfaits),
 * montant calculé automatiquement (modifiable), mode, encaissé ou non.
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun PaiementDialog(
    titre: String,
    seancesDues: Int,
    settings: SettingsEntity,
    initial: PaiementEntity?,
    onDismiss: () -> Unit,
    onDelete: (() -> Unit)? = null,
    onConfirm: (montant: Double, mode: String, nbSeances: Int, observation: String, encaisse: Boolean) -> Unit
) {
    val limite = settings.seancesParPaiement.coerceAtLeast(1)
    val prixSeance = settings.tarifForfait / limite
    // Par défaut on règle toutes les séances faites : le compteur repart de 0
    val nbInitial = initial?.nbSeancesReglees ?: if (seancesDues > 0) seancesDues else limite
    var nbSeances by remember { mutableIntStateOf(nbInitial) }
    var montantText by remember { mutableStateOf(formatMontant(initial?.montant ?: (prixSeance * nbInitial))) }
    var montantModifie by remember { mutableStateOf(initial != null) }
    var selectedMode by remember { mutableStateOf(initial?.modePaiement ?: "Espèces") }
    var observation by remember { mutableStateOf(initial?.observation ?: "") }
    var encaisse by remember { mutableStateOf(initial?.estEncaisse ?: true) }
    val modesList = listOf("Espèces", "Virement", "Carte", "Chèque")

    fun changerNb(n: Int) {
        nbSeances = n.coerceIn(1, 99)
        if (!montantModifie) montantText = formatMontant(prixSeance * nbSeances)
    }

    val reste = seancesDues - nbSeances

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(titre) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.verticalScroll(rememberScrollState())) {
                Text("Nombre de séances payées", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    FilledTonalIconButton(onClick = { changerNb(nbSeances - 1) }) { Icon(Icons.Default.Remove, contentDescription = "Moins") }
                    Text("$nbSeances", fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 16.dp))
                    FilledTonalIconButton(onClick = { changerNb(nbSeances + 1) }) { Icon(Icons.Default.Add, contentDescription = "Plus") }
                    Spacer(modifier = Modifier.width(8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        (listOfNotNull(seancesDues.takeIf { it > 0 }) + listOf(limite, limite * 2)).distinct().forEach { n ->
                            SuggestionChip(onClick = { changerNb(n) }, label = { Text("$n") })
                        }
                    }
                }
                Text(
                    when {
                        reste > 0 -> "Séances faites non payées : $seancesDues → il en restera $reste à payer."
                        reste < 0 -> "Séances faites non payées : ${seancesDues.coerceAtLeast(0)} → crédit de ${-reste} séance(s) payée(s) d'avance."
                        else -> "Séances faites non payées : $seancesDues → tout est réglé, le compteur repart de 0."
                    },
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = montantText,
                    onValueChange = { montantText = it; montantModifie = true },
                    label = { Text("Montant (${settings.devise})") },
                    supportingText = { Text("${formatMontant(prixSeance)} ${settings.devise} par séance") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Mode de paiement :", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    modesList.forEach { mode ->
                        FilterChip(selected = selectedMode == mode, onClick = { selectedMode = mode }, label = { Text(mode, fontSize = 12.sp) })
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().clickable { encaisse = !encaisse }) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Encaissé", fontWeight = FontWeight.SemiBold)
                        Text(
                            if (encaisse) "L'argent est reçu" else "Prévu, pas encore reçu (ex. chèque à déposer)",
                            fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Switch(checked = encaisse, onCheckedChange = { encaisse = it })
                }

                OutlinedTextField(
                    value = observation,
                    onValueChange = { observation = it },
                    label = { Text("Observation (facultative)") },
                    modifier = Modifier.fillMaxWidth()
                )

                if (onDelete != null) {
                    TextButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = null, tint = StatusRed, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Annuler ce versement", color = StatusRed)
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val m = montantText.replace(',', '.').replace(" ", "").replace(" ", "").replace(" ", "").trim().toDoubleOrNull()
                        ?: (prixSeance * nbSeances)
                    onConfirm(m, selectedMode, nbSeances, observation.trim(), encaisse)
                },
                colors = ButtonDefaults.buttonColors(containerColor = StatusGreen)
            ) { Text(if (initial == null) "Valider le paiement" else "Enregistrer") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}

/** Encaissement : choisir le groupe, puis encaisser élève par élève. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun EncaisserParGroupe(
    groupes: List<com.example.data.local.entity.GroupeEntity>,
    eleves: List<EleveEntity>,
    paiements: List<PaiementEntity>,
    settings: SettingsEntity,
    onEncaisser: (EleveEntity) -> Unit
) {
    val limite = settings.seancesParPaiement.coerceAtLeast(1)
    val prixSeance = settings.tarifForfait / limite
    val dateFormat = remember { SimpleDateFormat("dd/MM/yyyy", Locale.FRANCE) }
    fun memeNom(a: String?, b: String) = a != null && a.trim().equals(b.trim(), ignoreCase = true)

    val listes: List<Pair<String, List<EleveEntity>>> = remember(groupes, eleves) {
        val parGroupe = groupes.map { g -> g.nom to eleves.filter { memeNom(it.groupe, g.nom) } }
        val sans = eleves.filter { e -> groupes.none { memeNom(e.groupe, it.nom) } }
        (if (sans.isNotEmpty()) parGroupe + ("Sans groupe" to sans) else parGroupe)
            .map { (nom, l) -> nom to l.sortedBy { it.nom + it.prenom } }
    }
    var choix by remember { mutableStateOf(listes.firstOrNull { it.second.isNotEmpty() }?.first ?: listes.firstOrNull()?.first) }
    val groupe = listes.firstOrNull { it.first == choix } ?: listes.firstOrNull()
    val debutJour = remember {
        java.util.Calendar.getInstance().apply {
            set(java.util.Calendar.HOUR_OF_DAY, 0); set(java.util.Calendar.MINUTE, 0); set(java.util.Calendar.SECOND, 0); set(java.util.Calendar.MILLISECOND, 0)
        }.timeInMillis
    }

    if (eleves.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) { Text("Ajoutez d'abord des élèves.") }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 96.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Text("1. Choisissez le groupe", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listes.forEach { (nom, l) ->
                    val dus = l.count { it.sessionsInCurrentCycle > 0 }
                    FilterChip(
                        selected = groupe?.first == nom,
                        onClick = { choix = nom },
                        label = { Text("$nom (${l.size})" + if (dus > 0) " · $dus à payer" else "") }
                    )
                }
            }
        }
        if (groupe != null) {
            item {
                val reste = groupe.second.sumOf { (it.sessionsInCurrentCycle.coerceAtLeast(0)) * prixSeance }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("2. Encaissez élève par élève", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                    Text("Reste : ${formatMontant(reste)} ${settings.devise}", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
            if (groupe.second.isEmpty()) {
                item { Text("Aucun élève dans ce groupe.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
            items(groupe.second, key = { it.id }) { e ->
                val dues = e.sessionsInCurrentCycle
                val dernier = paiements.filter { it.eleveId == e.id }.maxByOrNull { it.dateEpochMs }
                val payeAujourdhui = dernier != null && dernier.dateEpochMs >= debutJour && dues <= 0
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("${e.prenom} ${e.nom}", fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    if (payeAujourdhui) "✓ Payé" else libelleCycle(dues, limite),
                                    fontSize = 12.sp, fontWeight = FontWeight.Bold,
                                    color = when { payeAujourdhui || dues <= 0 -> StatusGreen; dues >= limite -> StatusRed; else -> StatusOrange }
                                )
                            }
                            Text(
                                when {
                                    dues > 0 -> "$dues séance${if (dues > 1) "s" else ""} à payer · ${formatMontant(dues * prixSeance)} ${settings.devise}"
                                    dues < 0 -> "Crédit : ${-dues} séance(s) payée(s) d'avance"
                                    else -> "À jour · compteur à 0"
                                },
                                fontSize = 13.sp
                            )
                            Text(
                                dernier?.let { "Dernier paiement : ${dateFormat.format(Date(it.dateEpochMs))} · ${formatMontant(it.montant)} ${settings.devise} · ${it.nbSeancesReglees} séance(s)" }
                                    ?: "Aucun paiement",
                                fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = { onEncaisser(e) },
                            colors = ButtonDefaults.buttonColors(containerColor = StatusGreen),
                            contentPadding = PaddingValues(horizontal = 12.dp)
                        ) { Text("Encaisser") }
                    }
                }
            }
        }
    }
}
