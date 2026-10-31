package com.example.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Notes
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable

/** Icônes Notes et Paramètres, affichées en haut à droite de chaque écran. */
@Composable
fun RaccourcisNavigation() {
    val naviguer = LocalNavigation.current
    IconButton(onClick = { naviguer(NavigationTab.NOTES) }) {
        Icon(Icons.Outlined.Notes, contentDescription = "Notes")
    }
    IconButton(onClick = { naviguer(NavigationTab.PARAMETRES) }) {
        Icon(Icons.Outlined.Settings, contentDescription = "Paramètres")
    }
}
