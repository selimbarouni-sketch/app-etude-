package com.example.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.ui.theme.StatusRed

/** Écran de saisie du code d'accès (4 à 8 chiffres). */
@Composable
fun VerrouillageScreen(codeParDefaut: Boolean, onValider: (String) -> Boolean) {
    var code by remember { mutableStateOf("") }
    var erreur by remember { mutableStateOf(false) }

    fun valider() {
        if (code.length < 4) return
        if (!onValider(code)) {
            erreur = true
            code = ""
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(
            painter = painterResource(R.drawable.app_logo_1785142874979),
            contentDescription = null,
            modifier = Modifier.size(84.dp).clip(RoundedCornerShape(20.dp))
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.width(4.dp))
            Text("Saisissez votre code d'accès", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        Spacer(modifier = Modifier.height(24.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            repeat(maxOf(4, code.length)) { i ->
                Box(
                    modifier = Modifier
                        .size(16.dp)
                        .clip(CircleShape)
                        .background(if (i < code.length) MaterialTheme.colorScheme.primary else Color.Transparent)
                        .border(1.5.dp, if (erreur) StatusRed else MaterialTheme.colorScheme.primary, CircleShape)
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            when {
                erreur -> "Code incorrect, réessayez."
                codeParDefaut -> "Code par défaut : 1234 (modifiable dans Paramètres)"
                else -> " "
            },
            color = if (erreur) StatusRed else MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 13.sp
        )
        Spacer(modifier = Modifier.height(24.dp))

        val touches = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK")
        touches.chunked(3).forEach { ligne ->
            Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                ligne.forEach { t ->
                    val estOk = t == "OK"
                    FilledTonalButton(
                        onClick = {
                            erreur = false
                            when (t) {
                                "⌫" -> code = code.dropLast(1)
                                "OK" -> valider()
                                else -> if (code.length < 8) {
                                    code += t
                                    // Déverrouillage automatique dès que le bon code est tapé
                                    if (code.length >= 4) onValider(code)
                                }
                            }
                        },
                        enabled = !estOk || code.length >= 4,
                        shape = CircleShape,
                        modifier = Modifier.size(72.dp),
                        contentPadding = PaddingValues(0.dp)
                    ) {
                        if (t == "⌫") Icon(Icons.AutoMirrored.Filled.Backspace, contentDescription = "Effacer")
                        else Text(t, fontSize = if (estOk) 16.sp else 24.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
            Spacer(modifier = Modifier.height(14.dp))
        }
    }
}
