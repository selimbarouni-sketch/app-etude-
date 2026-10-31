package com.example.ui.screens

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.SettingsEntity
import com.example.ui.theme.*
import com.example.ui.navigation.RaccourcisNavigation
import com.example.ui.viewmodel.ProfViewModel
import com.example.util.CommunicationHelper
import com.example.util.DatabaseBackupHelper
import com.example.util.ExcelCsvExporter
import com.example.util.PdfReportGenerator
import com.example.util.ShareHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParametresScreen(viewModel: ProfViewModel) {
    val context = LocalContext.current
    val settings by viewModel.settings.collectAsState()
    val styleChic by viewModel.styleChic.collectAsState()
    val codeActif by viewModel.codeActif.collectAsState()
    var dialogueCode by remember { mutableStateOf(false) }
    var dialogueDesactiver by remember { mutableStateOf(false) }
    val eleves by viewModel.allEleves.collectAsState()
    val seances by viewModel.allSeances.collectAsState()
    val paiements by viewModel.allPaiements.collectAsState()

    var seancesParPaiement by remember(settings) { mutableStateOf(settings.seancesParPaiement.toString()) }
    var tarifForfait by remember(settings) { mutableStateOf(settings.tarifForfait.toString()) }
    var dureeParDefaut by remember(settings) { mutableStateOf(settings.dureeParDefautHeures.toString()) }
    var devise by remember(settings) { mutableStateOf(settings.devise) }
    var smsTemplate by remember(settings) { mutableStateOf(settings.smsTemplateRappel) }
    var smsTemplatePaiement by remember(settings) { mutableStateOf(settings.smsTemplatePaiement) }
    var darkMode by remember(settings) { mutableStateOf(settings.modeSombre) }

    var showWhatsAppGroupDialog by remember { mutableStateOf(false) }
    var showPdfGeneratorDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Paramètres", fontWeight = FontWeight.Bold) },
                actions = { RaccourcisNavigation() },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(top = 8.dp, bottom = 80.dp)
        ) {
            // Section 0: Thème & Apparence (Changer de Thème)
            item {
                Text("Apparence & Thème", fontWeight = FontWeight.Bold, color = PrimaryBlue, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (darkMode) Icons.Default.DarkMode else Icons.Default.LightMode,
                                contentDescription = null,
                                tint = PrimaryBlue,
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("Mode Sombre / Thème Foncé", fontWeight = FontWeight.Bold)
                                Text(
                                    text = if (darkMode) "Thème sombre actif" else "Thème clair actif",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Switch(
                            checked = darkMode,
                            onCheckedChange = { isChecked ->
                                darkMode = isChecked
                                viewModel.saveSettings(settings.copy(modeSombre = isChecked))
                                Toast.makeText(
                                    context,
                                    if (isChecked) "Mode sombre activé !" else "Mode clair activé !",
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                // Choix du style : Classique ou Chic
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    ApercuStyle(
                        titre = "Classique",
                        description = "Bleu, moderne",
                        couleurs = listOf(Color(0xFF1565C0), Color(0xFFF4F6F9), Color(0xFF2E7D32)),
                        selectionne = !styleChic,
                        modifier = Modifier.weight(1f),
                        onClick = { viewModel.setStyleChic(false) }
                    )
                    ApercuStyle(
                        titre = "Chic",
                        description = "Ivoire, bleu nuit et or",
                        couleurs = listOf(Color(0xFF1F2A44), Color(0xFFF7F3EC), Color(0xFFB08D57)),
                        selectionne = styleChic,
                        modifier = Modifier.weight(1f),
                        onClick = { viewModel.setStyleChic(true) }
                    )
                }
            }

            // Sécurité : code d'accès
            item {
                Text("Sécurité", fontWeight = FontWeight.Bold, color = PrimaryBlue, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = PrimaryBlue)
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Code d'accès", fontWeight = FontWeight.Bold)
                                Text(
                                    if (!codeActif) "Désactivé" else if (viewModel.codeParDefaut) "Activé · code par défaut 1234" else "Activé · code personnalisé",
                                    fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Switch(
                                checked = codeActif,
                                onCheckedChange = { actif ->
                                    if (actif) viewModel.setCodeActif(true) else dialogueDesactiver = true
                                }
                            )
                        }
                        OutlinedButton(onClick = { dialogueCode = true }, modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Default.Password, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Modifier le code")
                        }
                        Button(onClick = { viewModel.verrouiller() }, enabled = codeActif, modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Default.Lock, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Verrouiller maintenant")
                        }
                    }
                }
            }

            // Section 1: Configuration Tarification
            item {
                Text("Configuration Cours & Forfait", fontWeight = FontWeight.Bold, color = PrimaryBlue, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = seancesParPaiement,
                            onValueChange = { seancesParPaiement = it },
                            label = { Text("Séances avant paiement (défaut : 4)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = tarifForfait,
                            onValueChange = { tarifForfait = it },
                            label = { Text("Montant du forfait ($devise)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = dureeParDefaut,
                                onValueChange = { dureeParDefaut = it },
                                label = { Text("Durée cours par défaut (h)") },
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                            OutlinedTextField(
                                value = devise,
                                onValueChange = { devise = it },
                                label = { Text("Devise") },
                                modifier = Modifier.weight(1f),
                                singleLine = true
                            )
                        }

                        Button(
                            onClick = {
                                val sCount = (seancesParPaiement.trim().toIntOrNull() ?: 4).coerceAtLeast(1)
                                val tForfait = tarifForfait.replace(',', '.').trim().toDoubleOrNull() ?: 100.0
                                val dHeures = dureeParDefaut.replace(',', '.').trim().toFloatOrNull() ?: 2.0f
                                viewModel.saveSettings(
                                    settings.copy(
                                        seancesParPaiement = sCount,
                                        tarifForfait = tForfait,
                                        dureeParDefautHeures = dHeures,
                                        devise = devise.trim().ifBlank { "TND" },
                                        smsTemplateRappel = smsTemplate,
                                        smsTemplatePaiement = smsTemplatePaiement,
                                        modeSombre = darkMode
                                    )
                                )
                                Toast.makeText(context, "Modifications enregistrées !", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue)
                        ) {
                            Icon(Icons.Default.Save, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Enregistrer les réglages")
                        }
                    }
                }
            }

            // Section 2: Modèles SMS & WhatsApp
            item {
                Text("Modèles de Messages", fontWeight = FontWeight.Bold, color = PrimaryBlue, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = smsTemplate,
                            onValueChange = { smsTemplate = it },
                            label = { Text("Modèle SMS de Rappel") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            text = "Mots-clés supportés : {prenom}, {nom}, {classe}, {heure}",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        OutlinedTextField(
                            value = smsTemplatePaiement,
                            onValueChange = { smsTemplatePaiement = it },
                            label = { Text("Modèle de rappel de paiement") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text(
                            text = "Mots-clés supportés : {prenom}, {nom}, {classe}, {montant}, {devise}",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        // Correction : ces modèles n'étaient enregistrés que via le bouton de la section Tarifs
                        Button(
                            onClick = {
                                viewModel.saveSettings(settings.copy(smsTemplateRappel = smsTemplate, smsTemplatePaiement = smsTemplatePaiement))
                                Toast.makeText(context, "Modèles enregistrés !", Toast.LENGTH_SHORT).show()
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue)
                        ) {
                            Icon(Icons.Default.Save, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Enregistrer les modèles")
                        }
                    }
                }
            }

            // Section 3: WhatsApp Group Tool
            item {
                Text("Outils WhatsApp", fontWeight = FontWeight.Bold, color = PrimaryBlue, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showWhatsAppGroupDialog = true },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.GroupAdd, contentDescription = null, tint = StatusGreen, modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Créer / Envoyer Groupe WhatsApp", fontWeight = FontWeight.Bold)
                            Text("Sélectionnez plusieurs élèves et préparez la liste dans WhatsApp", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.Default.ArrowForwardIos, contentDescription = null, modifier = Modifier.size(16.dp))
                    }
                }
            }

            // Section 4: Export Excel & PDF
            item {
                Text("Exportation & Rapports PDF/Excel", fontWeight = FontWeight.Bold, color = PrimaryBlue, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { showPdfGeneratorDialog = true },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.PictureAsPdf, contentDescription = null, tint = StatusRed)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Générer Rapport PDF Élève / Cours")
                    }

                    OutlinedButton(
                        onClick = {
                            val f = ExcelCsvExporter.exportElevesToCsv(context, eleves)
                            if (f != null) ShareHelper.partagerFichier(context, f, "text/csv", "Exporter les élèves")
                            else Toast.makeText(context, "Erreur lors de l'export", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.TableChart, contentDescription = null, tint = StatusGreen)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Exporter Élèves (Excel / CSV)")
                    }

                    OutlinedButton(
                        onClick = {
                            val f = ExcelCsvExporter.exportSeancesToCsv(context, seances)
                            if (f != null) ShareHelper.partagerFichier(context, f, "text/csv", "Exporter les séances")
                            else Toast.makeText(context, "Erreur lors de l'export", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.TableChart, contentDescription = null, tint = StatusGreen)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Exporter Séances (Excel / CSV)")
                    }

                    OutlinedButton(
                        onClick = {
                            val f = ExcelCsvExporter.exportPaiementsToCsv(context, paiements, settings.devise)
                            if (f != null) ShareHelper.partagerFichier(context, f, "text/csv", "Exporter les paiements")
                            else Toast.makeText(context, "Erreur lors de l'export", Toast.LENGTH_SHORT).show()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.TableChart, contentDescription = null, tint = StatusGreen)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Exporter Paiements (Excel / CSV)")
                    }
                }
            }

            // Section 5: Sauvegarde SQLite
            item {
                Text("Sauvegarde de la Base SQLite", fontWeight = FontWeight.Bold, color = PrimaryBlue, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                val file = DatabaseBackupHelper.exportDatabase(context)
                                if (file != null) {
                                    // Partager vers Drive / e-mail pour garder une copie hors du téléphone
                                    ShareHelper.partagerFichier(context, file, "application/octet-stream", "Enregistrer la sauvegarde")
                                } else {
                                    Toast.makeText(context, "Erreur lors de la sauvegarde", Toast.LENGTH_SHORT).show()
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = SecondaryBlue)
                        ) {
                            Icon(Icons.Default.Backup, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Sauvegarder la Base de Données")
                        }
                    }
                }
            }
        }
    }

    if (dialogueCode) {
        ChangerCodeDialog(
            onDismiss = { dialogueCode = false },
            onValider = { actuel, nouveau, confirmation ->
                val erreur = viewModel.changerCode(actuel, nouveau, confirmation)
                if (erreur == null) {
                    dialogueCode = false
                    Toast.makeText(context, "Code d'accès modifié", Toast.LENGTH_SHORT).show()
                }
                erreur
            }
        )
    }

    if (dialogueDesactiver) {
        var code by remember { mutableStateOf("") }
        var erreur by remember { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { dialogueDesactiver = false },
            title = { Text("Désactiver le code ?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("L'application s'ouvrira sans code. Saisissez le code actuel pour confirmer.", fontSize = 13.sp)
                    ChampCode("Code actuel", code, erreur) { code = it; erreur = false }
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    if (viewModel.setCodeActif(false, code)) dialogueDesactiver = false else erreur = true
                }) { Text("Désactiver") }
            },
            dismissButton = { TextButton(onClick = { dialogueDesactiver = false }) { Text("Annuler") } }
        )
    }

    // Modal: WhatsApp Multi-Contact Group Helper
    if (showWhatsAppGroupDialog) {
        WhatsAppGroupSelectorDialog(
            eleves = eleves,
            onDismiss = { showWhatsAppGroupDialog = false },
            onConfirm = { selectedPhones ->
                CommunicationHelper.creerGroupeWhatsappHelper(context, selectedPhones)
                showWhatsAppGroupDialog = false
            }
        )
    }

    // Modal: PDF Generator
    if (showPdfGeneratorDialog) {
        PdfGeneratorDialog(
            eleves = eleves,
            seances = seances,
            paiements = paiements,
            devise = settings.devise,
            onDismiss = { showPdfGeneratorDialog = false },
            onGenerate = { eleve ->
                val eleveSeances = seances.filter { it.eleveId == eleve.id }
                val elevePaiements = paiements.filter { it.eleveId == eleve.id }
                val file = PdfReportGenerator.generateEleveRapportPdf(
                    context, eleve, eleveSeances, elevePaiements, settings.devise, settings.seancesParPaiement,
                    context.getString(com.example.R.string.app_name)
                )
                if (file != null) {
                    ShareHelper.partagerFichier(context, file, "application/pdf", "Partager le rapport PDF")
                } else {
                    Toast.makeText(context, "Erreur de génération PDF", Toast.LENGTH_SHORT).show()
                }
                showPdfGeneratorDialog = false
            }
        )
    }
}

@Composable
private fun ChampCode(label: String, valeur: String, erreur: Boolean, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = valeur,
        onValueChange = { v -> onChange(v.filter { it.isDigit() }.take(8)) },
        label = { Text(label) },
        singleLine = true,
        isError = erreur,
        visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        modifier = Modifier.fillMaxWidth()
    )
}

@Composable
private fun ChangerCodeDialog(onDismiss: () -> Unit, onValider: (String, String, String) -> String?) {
    var actuel by remember { mutableStateOf("") }
    var nouveau by remember { mutableStateOf("") }
    var confirmation by remember { mutableStateOf("") }
    var erreur by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Modifier le code d'accès") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ChampCode("Code actuel", actuel, erreur != null) { actuel = it; erreur = null }
                ChampCode("Nouveau code (4 à 8 chiffres)", nouveau, false) { nouveau = it; erreur = null }
                ChampCode("Confirmer le nouveau code", confirmation, false) { confirmation = it; erreur = null }
                erreur?.let { Text(it, color = StatusRed, fontSize = 12.sp) }
            }
        },
        confirmButton = { Button(onClick = { erreur = onValider(actuel, nouveau, confirmation) }) { Text("Enregistrer") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ApercuStyle(
    titre: String,
    description: String,
    couleurs: List<Color>,
    selectionne: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    OutlinedCard(
        onClick = onClick,
        modifier = modifier,
        border = BorderStroke(if (selectionne) 2.dp else 1.dp, if (selectionne) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline)
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                couleurs.forEach { c ->
                    Box(
                        modifier = Modifier
                            .size(18.dp)
                            .clip(CircleShape)
                            .background(c)
                            .border(1.dp, Color.Black.copy(alpha = 0.1f), CircleShape)
                    )
                }
            }
            Text(titre, fontWeight = FontWeight.Bold)
            Text(description, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun WhatsAppGroupSelectorDialog(
    eleves: List<EleveEntity>,
    onDismiss: () -> Unit,
    onConfirm: (List<String>) -> Unit
) {
    val selectedIds = remember { mutableStateListOf<Int>() }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Sélectionner les élèves pour WhatsApp") },
        text = {
            Column {
                Text(
                    text = "Sélectionnez les élèves à inclure pour l'envoi de groupe.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
                LazyColumn(modifier = Modifier.height(250.dp)) {
                    items(eleves) { eleve ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    if (selectedIds.contains(eleve.id)) selectedIds.remove(eleve.id)
                                    else selectedIds.add(eleve.id)
                                }
                                .padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = selectedIds.contains(eleve.id),
                                onCheckedChange = {
                                    if (it) selectedIds.add(eleve.id) else selectedIds.remove(eleve.id)
                                }
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("${eleve.prenom} ${eleve.nom} (${eleve.telephone})", fontSize = 14.sp)
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val phones = eleves.filter { selectedIds.contains(it.id) }.map { it.telephone }
                    onConfirm(phones)
                },
                enabled = selectedIds.isNotEmpty()
            ) {
                Text("Ouvrir WhatsApp (${selectedIds.size})")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuler") }
        }
    )
}

@Composable
fun PdfGeneratorDialog(
    eleves: List<EleveEntity>,
    seances: List<com.example.data.local.entity.SeanceEntity>,
    paiements: List<com.example.data.local.entity.PaiementEntity>,
    devise: String,
    onDismiss: () -> Unit,
    onGenerate: (EleveEntity) -> Unit
) {
    var selectedEleve by remember { mutableStateOf(eleves.firstOrNull()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Générer Rapport PDF") },
        text = {
            Column {
                Text("Sélectionnez l'élève pour le rapport :")
                Spacer(modifier = Modifier.height(8.dp))
                LazyColumn(modifier = Modifier.height(200.dp)) {
                    items(eleves) { eleve ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedEleve = eleve }
                                .padding(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = selectedEleve?.id == eleve.id,
                                onClick = { selectedEleve = eleve }
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("${eleve.prenom} ${eleve.nom} (${eleve.classe})")
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (selectedEleve != null) onGenerate(selectedEleve!!)
                },
                enabled = selectedEleve != null
            ) {
                Text("Générer le PDF")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuler") }
        }
    )
}
