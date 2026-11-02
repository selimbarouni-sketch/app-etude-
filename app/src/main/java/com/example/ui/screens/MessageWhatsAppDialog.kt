package com.example.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.GroupeEntity
import com.example.ui.theme.StatusGreen
import com.example.util.CommunicationHelper
import com.example.util.remplirModele

/**
 * Message WhatsApp à plusieurs élèves.
 * WhatsApp ne permet pas à une application de créer un groupe ou d'envoyer à plusieurs numéros :
 * on prépare le message, puis on l'envoie à chaque élève en un appui (WhatsApp s'ouvre à chaque fois).
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun MessageWhatsAppDialog(
    eleves: List<EleveEntity>,
    groupes: List<GroupeEntity>,
    modele: String,
    groupeInitial: String? = null,
    heureCours: (EleveEntity) -> String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var groupe by remember { mutableStateOf(groupeInitial) } // null = tous
    val exclus = remember { mutableStateListOf<Int>() }
    var message by remember { mutableStateOf(modele) }
    var etape by remember { mutableIntStateOf(1) }
    val envoyes = remember { mutableStateListOf<Int>() }

    val liste = eleves
        .filter { e -> groupe == null || e.groupe?.trim().equals(groupe!!.trim(), ignoreCase = true) }
        .sortedBy { it.nom + it.prenom }
    val choisis = liste.filter { it.id !in exclus && it.telephone.isNotBlank() }

    fun texte(e: EleveEntity) = remplirModele(message, e.prenom, e.nom, e.classe, heureCours(e))

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(if (etape == 1) "Message WhatsApp groupé" else "Envoyer (${envoyes.size}/${choisis.size})") },
                    navigationIcon = { IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, contentDescription = "Fermer") } }
                )
            },
            bottomBar = {
                Surface(tonalElevation = 3.dp) {
                    Row(modifier = Modifier.navigationBarsPadding().imePadding().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (etape == 1) {
                            OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Annuler") }
                            Button(onClick = { etape = 2 }, enabled = choisis.isNotEmpty() && message.isNotBlank(), modifier = Modifier.weight(1f)) {
                                Text("Suivant (${choisis.size})")
                            }
                        } else {
                            OutlinedButton(onClick = { etape = 1 }, modifier = Modifier.weight(1f)) { Text("Retour") }
                            Button(onClick = onDismiss, modifier = Modifier.weight(1f)) { Text("Terminer") }
                        }
                    }
                }
            }
        ) { padding ->
            if (etape == 1) {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    item {
                        Text("Destinataires", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            FilterChip(selected = groupe == null, onClick = { groupe = null; exclus.clear() }, label = { Text("Tous") })
                            groupes.forEach { g ->
                                FilterChip(selected = groupe == g.nom, onClick = { groupe = g.nom; exclus.clear() }, label = { Text(g.nom) })
                            }
                        }
                    }
                    items(liste, key = { it.id }) { e ->
                        val aTel = e.telephone.isNotBlank()
                        Row(
                            modifier = Modifier.fillMaxWidth().clickable(enabled = aTel) { if (e.id in exclus) exclus.remove(e.id) else exclus.add(e.id) },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(checked = aTel && e.id !in exclus, enabled = aTel, onCheckedChange = { if (it) exclus.remove(e.id) else exclus.add(e.id) })
                            Text("${e.prenom} ${e.nom}", modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(if (aTel) e.telephone else "pas de numéro", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = message,
                            onValueChange = { message = it },
                            label = { Text("Message") },
                            supportingText = { Text("Remplacés pour chaque élève : {prenom} {nom} {classe} {heure}") },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp)
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    item {
                        Text(
                            "Appuyez sur « Envoyer » pour chaque élève : WhatsApp s'ouvre avec le message prêt. Appuyez sur Envoyer dans WhatsApp, puis revenez ici.",
                            fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    items(choisis, key = { it.id }) { e ->
                        val fait = e.id in envoyes
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("${e.prenom} ${e.nom}", fontWeight = FontWeight.SemiBold)
                                Text(e.telephone, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (fait) {
                                OutlinedButton(onClick = { CommunicationHelper.envoyerWhatsapp(context, e.telephone, texte(e)) }) {
                                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Envoyé")
                                }
                            } else {
                                Button(
                                    onClick = {
                                        envoyes.add(e.id)
                                        CommunicationHelper.envoyerWhatsapp(context, e.telephone, texte(e))
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = StatusGreen)
                                ) { Text("Envoyer") }
                            }
                        }
                    }
                }
            }
        }
    }
}
