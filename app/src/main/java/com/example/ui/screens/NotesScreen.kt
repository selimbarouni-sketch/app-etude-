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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.DossierNoteEntity
import com.example.data.local.entity.NoteEntity
import com.example.ui.theme.*
import com.example.ui.navigation.RaccourcisNavigation
import com.example.ui.viewmodel.ProfViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotesScreen(viewModel: ProfViewModel) {
    val allNotes by viewModel.allNotes.collectAsState()
    val dossiers by viewModel.allDossiers.collectAsState()

    var searchQuery by remember { mutableStateOf("") }
    var selectedDossierId by remember { mutableStateOf<Int?>(null) }

    var showAddNoteDialog by remember { mutableStateOf(false) }
    var showAddDossierDialog by remember { mutableStateOf(false) }
    var noteToEdit by remember { mutableStateOf<NoteEntity?>(null) }

    val filteredNotes = remember(allNotes, searchQuery, selectedDossierId) {
        allNotes.filter { note ->
            (selectedDossierId == null || note.dossierId == selectedDossierId) &&
            (searchQuery.isBlank() || note.titre.lowercase().contains(searchQuery.lowercase()) || note.contenu.lowercase().contains(searchQuery.lowercase()))
        }.sortedByDescending { it.estFavori } // favoris en premier
    }

    val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.FRANCE)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Bloc-notes (${filteredNotes.size})", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { showAddDossierDialog = true }) {
                        Icon(Icons.Default.CreateNewFolder, contentDescription = "Nouveau dossier", tint = PrimaryBlue)
                    }
                    RaccourcisNavigation()
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddNoteDialog = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Nouvelle Note")
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
        ) {
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Rechercher dans les notes...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Dossiers Filter Row
            ScrollableTabRow(
                selectedTabIndex = if (selectedDossierId == null) 0 else (dossiers.indexOfFirst { it.id == selectedDossierId } + 1).coerceAtLeast(0),
                edgePadding = 0.dp
            ) {
                Tab(
                    selected = selectedDossierId == null,
                    onClick = { selectedDossierId = null },
                    text = { Text("Tous (Notes)") }
                )
                dossiers.forEach { dossier ->
                    Tab(
                        selected = selectedDossierId == dossier.id,
                        onClick = { selectedDossierId = dossier.id },
                        text = { Text("📁 ${dossier.nom}") }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (filteredNotes.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Notes,
                            contentDescription = null,
                            modifier = Modifier.size(56.dp),
                            tint = MaterialTheme.colorScheme.outline
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Aucune note dans ce dossier.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(filteredNotes, key = { it.id }) { note ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { noteToEdit = note },
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = note.titre,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp
                                    )
                                    Row {
                                        IconButton(
                                            onClick = {
                                                viewModel.updateNote(note.copy(estFavori = !note.estFavori))
                                            }
                                        ) {
                                            Icon(
                                                imageVector = if (note.estFavori) Icons.Default.Star else Icons.Default.StarBorder,
                                                contentDescription = "Favori",
                                                tint = if (note.estFavori) StatusOrange else MaterialTheme.colorScheme.outline
                                            )
                                        }
                                        IconButton(onClick = { viewModel.deleteNote(note) }) {
                                            Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = StatusRed)
                                        }
                                    }
                                }

                                Text(
                                    text = note.contenu,
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    maxLines = 3
                                )

                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = dateFormat.format(Date(note.dateEpochMs)),
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    if (showAddNoteDialog || noteToEdit != null) {
        AddOrEditNoteDialog(
            note = noteToEdit,
            dossiers = dossiers,
            currentDossierId = selectedDossierId,
            onDismiss = {
                showAddNoteDialog = false
                noteToEdit = null
            },
            onSave = { titre, contenu, dossierId, estFavori ->
                if (noteToEdit != null) {
                    viewModel.updateNote(
                        noteToEdit!!.copy(
                            titre = titre,
                            contenu = contenu,
                            dossierId = dossierId,
                            estFavori = estFavori
                        )
                    )
                } else {
                    viewModel.addNote(titre, contenu, dossierId, estFavori)
                }
                showAddNoteDialog = false
                noteToEdit = null
            }
        )
    }

    if (showAddDossierDialog) {
        AddDossierDialog(
            onDismiss = { showAddDossierDialog = false },
            onSave = { nom ->
                viewModel.addDossier(nom)
                showAddDossierDialog = false
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddOrEditNoteDialog(
    note: NoteEntity?,
    dossiers: List<DossierNoteEntity>,
    currentDossierId: Int?,
    onDismiss: () -> Unit,
    onSave: (titre: String, contenu: String, dossierId: Int?, estFavori: Boolean) -> Unit
) {
    var titre by remember { mutableStateOf(note?.titre ?: "") }
    var contenu by remember { mutableStateOf(note?.contenu ?: "") }
    var selectedDossier by remember { mutableStateOf(note?.dossierId ?: currentDossierId) }
    var estFavori by remember { mutableStateOf(note?.estFavori ?: false) }

    var expanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (note == null) "Nouvelle Note" else "Modifier Note") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = titre,
                    onValueChange = { titre = it },
                    label = { Text("Titre de la note") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = contenu,
                    onValueChange = { contenu = it },
                    label = { Text("Contenu") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp)
                )

                if (dossiers.isNotEmpty()) {
                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { expanded = !expanded }
                    ) {
                        OutlinedTextField(
                            value = dossiers.find { it.id == selectedDossier }?.nom ?: "Aucun dossier",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Dossier") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor()
                        )
                        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            DropdownMenuItem(
                                text = { Text("Aucun dossier") },
                                onClick = {
                                    selectedDossier = null
                                    expanded = false
                                }
                            )
                            dossiers.forEach { d ->
                                DropdownMenuItem(
                                    text = { Text("📁 ${d.nom}") },
                                    onClick = {
                                        selectedDossier = d.id
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (titre.isNotBlank()) {
                        onSave(titre, contenu, selectedDossier, estFavori)
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
}

@Composable
fun AddDossierDialog(
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var nom by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nouveau Dossier") },
        text = {
            OutlinedTextField(
                value = nom,
                onValueChange = { nom = it },
                label = { Text("Nom du dossier") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
        },
        confirmButton = {
            Button(
                onClick = {
                    if (nom.isNotBlank()) onSave(nom)
                }
            ) {
                Text("Créer")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuler") }
        }
    )
}
