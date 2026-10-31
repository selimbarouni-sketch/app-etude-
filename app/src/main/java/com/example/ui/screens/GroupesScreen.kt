package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.GroupeEntity
import com.example.ui.theme.*
import com.example.ui.navigation.RaccourcisNavigation
import com.example.ui.viewmodel.NouvelEleve
import com.example.ui.viewmodel.ProfViewModel
import java.text.SimpleDateFormat
import java.util.Locale

private fun memeNom(a: String?, b: String?) = a != null && b != null && a.trim().equals(b.trim(), ignoreCase = true)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GroupesScreen(viewModel: ProfViewModel) {
    val context = LocalContext.current
    val groupes by viewModel.allGroupes.collectAsState()
    val eleves by viewModel.allEleves.collectAsState()
    val settings by viewModel.settings.collectAsState()

    var creation by remember { mutableStateOf(false) }
    var edition by remember { mutableStateOf<GroupeEntity?>(null) }
    var ajoutDans by remember { mutableStateOf<GroupeEntity?>(null) }
    var detail by remember { mutableStateOf<GroupeEntity?>(null) }
    var aSupprimer by remember { mutableStateOf<GroupeEntity?>(null) }

    fun elevesDe(g: GroupeEntity) = eleves.filter { memeNom(it.groupe, g.nom) }.sortedBy { it.nom + it.prenom }
    val nbSansGroupe = eleves.count { e -> groupes.none { memeNom(it.nom, e.groupe) } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Groupes (${groupes.size})", fontWeight = FontWeight.Bold) },
                actions = { RaccourcisNavigation() },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { creation = true },
                icon = { Icon(Icons.Default.GroupAdd, contentDescription = null) },
                text = { Text("Nouveau groupe") },
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
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(top = 8.dp, bottom = 96.dp)
        ) {
            if (nbSansGroupe > 0 && groupes.isNotEmpty()) {
                item {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                        Row(modifier = Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = PrimaryBlue)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("$nbSansGroupe élève(s) ne sont dans aucun groupe.", fontSize = 13.sp)
                        }
                    }
                }
            }

            if (groupes.isEmpty()) {
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.Groups, contentDescription = null, modifier = Modifier.size(64.dp), tint = PrimaryBlue.copy(alpha = 0.5f))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Aucun groupe pour le moment.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(onClick = { creation = true }) { Text("Créer un groupe") }
                    }
                }
            }

            items(groupes, key = { it.id }) { g ->
                val membres = elevesDe(g)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.Top) {
                            Column(modifier = Modifier.weight(1f).clickable { detail = g }) {
                                Text(g.nom, style = MaterialTheme.typography.titleLarge, color = PrimaryBlue, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "Chaque ${g.jourSemaine.lowercase(Locale.FRANCE)} · ${g.heureDebut}–${g.heureFin}" + if (g.lieu.isNotBlank()) " · ${g.lieu}" else "",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            IconButton(onClick = { edition = g }) {
                                Icon(Icons.Default.Edit, contentDescription = "Modifier le groupe", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            IconButton(onClick = { aSupprimer = g }) {
                                Icon(Icons.Default.Delete, contentDescription = "Supprimer le groupe", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth().clickable { detail = g },
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            if (membres.isEmpty()) {
                                Text("Aucun élève", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            } else {
                                membres.take(6).forEach { Initiales(it, 32) }
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("${membres.size} élève${if (membres.size > 1) "s" else ""}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = { ajoutDans = g }, modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp)) {
                                Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Ajouter des élèves", maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                            OutlinedButton(
                                onClick = {
                                    viewModel.programmerProchaineSeanceGroupe(g)
                                    Toast.makeText(context, "Prochaine séance de ${g.nom} ajoutée à l'agenda", Toast.LENGTH_SHORT).show()
                                },
                                contentPadding = PaddingValues(horizontal = 12.dp)
                            ) {
                                Icon(Icons.Default.EventRepeat, contentDescription = "Programmer la prochaine séance", modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }
    }

    // Étape 1 : création du groupe → étape 2 : ajout des élèves
    if (creation) {
        GroupeFormDialog(
            groupe = null,
            autresGroupes = groupes,
            onDismiss = { creation = false },
            onSave = { nom, jour, debut, fin, lieu ->
                creation = false
                viewModel.creerGroupe(nom, jour, debut, fin, lieu) { cree -> ajoutDans = cree }
            }
        )
    }

    edition?.let { g ->
        GroupeFormDialog(
            groupe = g,
            autresGroupes = groupes,
            onDismiss = { edition = null },
            onSave = { nom, jour, debut, fin, lieu ->
                viewModel.updateGroupe(g.copy(nom = nom, jourSemaine = jour, heureDebut = debut, heureFin = fin, lieu = lieu))
                edition = null
            }
        )
    }

    ajoutDans?.let { g ->
        AjoutElevesDialog(
            groupe = g,
            eleves = eleves,
            onDismiss = { ajoutDans = null },
            onConfirm = { ids, nouveaux ->
                viewModel.ajouterElevesAuGroupe(g, ids, nouveaux)
                val total = ids.size + nouveaux.size
                Toast.makeText(context, "$total élève${if (total > 1) "s" else ""} ajouté${if (total > 1) "s" else ""} à ${g.nom}", Toast.LENGTH_SHORT).show()
                ajoutDans = null
            }
        )
    }

    detail?.let { d ->
        val g = groupes.firstOrNull { it.id == d.id } ?: d
        val membres = elevesDe(g)
        AlertDialog(
            onDismissRequest = { detail = null },
            title = { Text(g.nom) },
            text = {
                Column(
                    modifier = Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Chaque ${g.jourSemaine.lowercase(Locale.FRANCE)} · ${g.heureDebut}–${g.heureFin} · ${g.lieu}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (g.prochaineSeanceEpochMs > System.currentTimeMillis()) {
                        Text("Prochaine séance : ${SimpleDateFormat("EEEE d MMMM", Locale.FRANCE).format(g.prochaineSeanceEpochMs)}", fontSize = 12.sp)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    if (membres.isEmpty()) Text("Aucun élève dans ce groupe.")
                    membres.forEach { e ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Initiales(e, 34)
                            Spacer(modifier = Modifier.width(10.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text("${e.prenom} ${e.nom}", fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("${e.classe} · ${e.sessionsInCurrentCycle}/${settings.seancesParPaiement} séances", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            IconButton(onClick = {
                                viewModel.retirerDuGroupe(e)
                                Toast.makeText(context, "${e.prenom} retiré(e) du groupe", Toast.LENGTH_SHORT).show()
                            }) {
                                Icon(Icons.Default.PersonRemove, contentDescription = "Retirer du groupe", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = { detail = null; ajoutDans = g }) { Text("Ajouter des élèves") }
            },
            dismissButton = { TextButton(onClick = { detail = null }) { Text("Fermer") } }
        )
    }

    aSupprimer?.let { g ->
        AlertDialog(
            onDismissRequest = { aSupprimer = null },
            title = { Text("Supprimer le groupe ${g.nom} ?") },
            text = { Text("Le groupe et son créneau seront supprimés. Les élèves sont conservés et passent « sans groupe ».") },
            confirmButton = {
                TextButton(onClick = { viewModel.deleteGroupe(g); aSupprimer = null }) { Text("Supprimer", color = StatusRed) }
            },
            dismissButton = { TextButton(onClick = { aSupprimer = null }) { Text("Annuler") } }
        )
    }
}

@Composable
private fun Initiales(eleve: EleveEntity, taille: Int) {
    Box(
        modifier = Modifier
            .size(taille.dp)
            .clip(CircleShape)
            .background(PrimaryBlue.copy(alpha = 0.12f))
            .border(1.dp, SecondaryBlue.copy(alpha = 0.6f), CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Text(
            "${eleve.prenom.take(1)}${eleve.nom.take(1)}".uppercase(),
            fontSize = (taille * 0.36f).sp,
            fontWeight = FontWeight.Bold,
            color = PrimaryBlue
        )
    }
}

/** Indicateur des 2 étapes de l'assistant. */
@Composable
private fun Etapes(etape: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
        listOf("1. Le groupe", "2. Les élèves").forEachIndexed { i, libelle ->
            Column(modifier = Modifier.weight(1f)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .background(if (i + 1 == etape) SecondaryBlue else MaterialTheme.colorScheme.outline)
                )
                Text(
                    libelle,
                    fontSize = 12.sp,
                    fontWeight = if (i + 1 == etape) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (i + 1 == etape) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}

/** Création (groupe = null) ou modification d'un groupe. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GroupeFormDialog(
    groupe: GroupeEntity?,
    autresGroupes: List<GroupeEntity>,
    onDismiss: () -> Unit,
    onSave: (nom: String, jour: String, debut: String, fin: String, lieu: String) -> Unit
) {
    var nom by remember { mutableStateOf(groupe?.nom ?: "") }
    var jourSemaine by remember { mutableStateOf(groupe?.jourSemaine ?: "Samedi") }
    var heureDebut by remember { mutableStateOf(groupe?.heureDebut ?: "14:00") }
    var heureFin by remember { mutableStateOf(groupe?.heureFin ?: "16:00") }
    var lieu by remember { mutableStateOf(groupe?.lieu ?: "Salle principale") }
    val jours = listOf("Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche")
    val doublon = autresGroupes.any { it.id != groupe?.id && memeNom(it.nom, nom) }
    val valide = nom.isNotBlank() && !doublon

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (groupe == null) "Nouveau groupe" else "Modifier le groupe") },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.verticalScroll(rememberScrollState())
            ) {
                if (groupe == null) Etapes(1)
                OutlinedTextField(
                    value = nom,
                    onValueChange = { nom = it },
                    label = { Text("Nom du groupe *") },
                    placeholder = { Text("ex. Bac Math — samedi") },
                    singleLine = true,
                    isError = doublon,
                    supportingText = if (doublon) ({ Text("Un groupe porte déjà ce nom.") }) else null,
                    modifier = Modifier.fillMaxWidth()
                )
                Text("Jour de la semaine", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    jours.forEach { j ->
                        FilterChip(selected = jourSemaine == j, onClick = { jourSemaine = j }, label = { Text(j, fontSize = 12.sp) })
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = heureDebut, onValueChange = { heureDebut = it }, label = { Text("Début") }, singleLine = true, modifier = Modifier.weight(1f))
                    OutlinedTextField(value = heureFin, onValueChange = { heureFin = it }, label = { Text("Fin") }, singleLine = true, modifier = Modifier.weight(1f))
                }
                OutlinedTextField(value = lieu, onValueChange = { lieu = it }, label = { Text("Lieu") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            Button(
                onClick = { if (valide) onSave(nom.trim(), jourSemaine, heureDebut.trim(), heureFin.trim(), lieu.trim()) },
                enabled = valide
            ) { Text(if (groupe == null) "Suivant : les élèves" else "Enregistrer") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}

private data class LigneEleve(val prenom: String = "", val nom: String = "", val telephone: String = "", val classe: String = "") {
    val valide get() = prenom.isNotBlank() && nom.isNotBlank()
    val commencee get() = prenom.isNotBlank() || nom.isNotBlank() || telephone.isNotBlank()
}

/** Étape 2 : ajouter des élèves existants et/ou de nouveaux élèves au groupe (plein écran). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AjoutElevesDialog(
    groupe: GroupeEntity,
    eleves: List<EleveEntity>,
    onDismiss: () -> Unit,
    onConfirm: (idsExistants: List<Int>, nouveaux: List<NouvelEleve>) -> Unit
) {
    val candidatsTous = remember(eleves, groupe) {
        eleves.filter { !memeNom(it.groupe, groupe.nom) }
            .sortedWith(compareBy<EleveEntity> { !it.groupe.isNullOrBlank() }.thenBy { it.nom + it.prenom })
    }
    var onglet by remember { mutableIntStateOf(if (candidatsTous.isNotEmpty()) 0 else 1) }
    var recherche by remember { mutableStateOf("") }
    val selection = remember { mutableStateListOf<Int>() }
    val lignes = remember { mutableStateListOf(LigneEleve()) }

    val candidats = candidatsTous.filter { e ->
        val q = recherche.trim().lowercase()
        q.isEmpty() || listOf(e.nom, e.prenom, e.classe, e.groupe ?: "").any { it.lowercase().contains(q) }
    }
    val lignesValides = lignes.filter { it.valide }
    val incompletes = lignes.any { it.commencee && !it.valide }
    val total = selection.size + lignesValides.size

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("Ajouter des élèves", maxLines = 1)
                            Text(groupe.nom, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = "Fermer") }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
                )
            },
            bottomBar = {
                Surface(tonalElevation = 3.dp) {
                    Column(modifier = Modifier.navigationBarsPadding().imePadding().padding(16.dp)) {
                        if (incompletes) {
                            Text("Le prénom et le nom sont obligatoires pour chaque nouvel élève.", fontSize = 12.sp, color = StatusRed)
                            Spacer(modifier = Modifier.height(6.dp))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text(if (total == 0) "Plus tard" else "Annuler") }
                            Button(
                                onClick = {
                                    onConfirm(
                                        selection.toList(),
                                        lignesValides.map { NouvelEleve(it.prenom, it.nom, it.telephone, it.classe) }
                                    )
                                },
                                enabled = total > 0 && !incompletes,
                                modifier = Modifier.weight(1.4f)
                            ) { Text(if (total == 0) "Ajouter" else "Ajouter $total élève${if (total > 1) "s" else ""}") }
                        }
                    }
                }
            }
        ) { padding ->
            Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
                Spacer(modifier = Modifier.height(8.dp))
                Etapes(2)
                Spacer(modifier = Modifier.height(8.dp))
                TabRow(selectedTabIndex = onglet, containerColor = MaterialTheme.colorScheme.background) {
                    Tab(selected = onglet == 0, onClick = { onglet = 0 }, text = { Text("Existants" + if (selection.isNotEmpty()) " (${selection.size})" else "") })
                    Tab(selected = onglet == 1, onClick = { onglet = 1 }, text = { Text("Nouveaux" + if (lignesValides.isNotEmpty()) " (${lignesValides.size})" else "") })
                }
                Spacer(modifier = Modifier.height(8.dp))

                if (onglet == 0) {
                    if (candidatsTous.isEmpty()) {
                        Text(
                            "Tous vos élèves sont déjà dans ce groupe. Utilisez l'onglet « Nouveaux ».",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(vertical = 24.dp)
                        )
                    } else {
                        OutlinedTextField(
                            value = recherche,
                            onValueChange = { recherche = it },
                            placeholder = { Text("Rechercher un élève…") },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        if (candidats.size > 1) {
                            val tous = candidats.all { it.id in selection }
                            TextButton(onClick = {
                                if (tous) selection.removeAll { id -> candidats.any { it.id == id } }
                                else candidats.forEach { if (it.id !in selection) selection.add(it.id) }
                            }) { Text(if (tous) "Tout désélectionner" else "Tout sélectionner") }
                        }
                        if (selection.any { id -> !eleves.firstOrNull { it.id == id }?.groupe.isNullOrBlank() }) {
                            Text(
                                "Les élèves déjà dans un autre groupe y seront déplacés (un élève appartient à un seul groupe).",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        LazyColumn(modifier = Modifier.weight(1f)) {
                            items(candidats, key = { it.id }) { e ->
                                val coche = e.id in selection
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(MaterialTheme.shapes.small)
                                        .background(if (coche) MaterialTheme.colorScheme.primaryContainer else androidx.compose.ui.graphics.Color.Transparent)
                                        .clickable { if (coche) selection.remove(e.id) else selection.add(e.id) }
                                        .padding(vertical = 6.dp, horizontal = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(checked = coche, onCheckedChange = { if (it) selection.add(e.id) else selection.remove(e.id) })
                                    Initiales(e, 32)
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("${e.prenom} ${e.nom}", fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(e.classe, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    val autre = e.groupe?.takeIf { it.isNotBlank() }
                                    Text(
                                        autre ?: "Sans groupe",
                                        fontSize = 11.sp,
                                        color = if (autre != null) StatusOrange else StatusGreen,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.widthIn(max = 110.dp)
                                    )
                                }
                            }
                        }
                    }
                } else {
                    LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        itemsIndexed(lignes) { i, l ->
                            OutlinedCard(modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("Élève ${i + 1}", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.weight(1f))
                                        if (lignes.size > 1) {
                                            IconButton(onClick = { lignes.removeAt(i) }, modifier = Modifier.size(28.dp)) {
                                                Icon(Icons.Default.Close, contentDescription = "Retirer", modifier = Modifier.size(18.dp))
                                            }
                                        }
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedTextField(value = l.prenom, onValueChange = { lignes[i] = l.copy(prenom = it) }, label = { Text("Prénom *") }, singleLine = true, modifier = Modifier.weight(1f))
                                        OutlinedTextField(value = l.nom, onValueChange = { lignes[i] = l.copy(nom = it) }, label = { Text("Nom *") }, singleLine = true, modifier = Modifier.weight(1f))
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OutlinedTextField(
                                            value = l.telephone,
                                            onValueChange = { lignes[i] = l.copy(telephone = it) },
                                            label = { Text("Téléphone") },
                                            singleLine = true,
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                            modifier = Modifier.weight(1f)
                                        )
                                        OutlinedTextField(value = l.classe, onValueChange = { lignes[i] = l.copy(classe = it) }, label = { Text("Classe") }, singleLine = true, modifier = Modifier.weight(1f))
                                    }
                                }
                            }
                        }
                        item {
                            OutlinedButton(
                                onClick = { lignes.add(LigneEleve(classe = lignes.lastOrNull()?.classe ?: "")) },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Ajouter un autre élève")
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                        }
                    }
                }
            }
        }
    }
}
