package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.StatusRed

/** Action sensible (suppression d'un élève, correction d'un appel…) : le code d'accès est demandé. */
@Composable
fun DemandeCodeDialog(
    titre: String,
    message: String,
    libelle: String,
    verifier: (String) -> Boolean,
    onValide: () -> Unit,
    onDismiss: () -> Unit
) {
    var code by remember { mutableStateOf("") }
    var erreur by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(titre) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(message, fontSize = 14.sp)
                OutlinedTextField(
                    value = code,
                    onValueChange = { v -> code = v.filter { it.isDigit() }.take(8); erreur = false },
                    label = { Text("Code d'accès") },
                    singleLine = true,
                    isError = erreur,
                    supportingText = if (erreur) ({ Text("Code incorrect.") }) else null,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { if (verifier(code)) { onValide(); onDismiss() } else { erreur = true; code = "" } },
                enabled = code.length >= 4
            ) { Text(libelle, color = StatusRed) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuler") } }
    )
}
