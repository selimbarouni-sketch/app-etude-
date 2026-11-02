package com.example.ui.navigation

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.ui.screens.*
import com.example.ui.viewmodel.ProfViewModel

enum class NavigationTab(
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
    /** false : accessible par les icônes en haut à droite (Notes, Paramètres) */
    val dansBarre: Boolean = true
) {
    ACCUEIL("Accueil", Icons.Filled.Home, Icons.Outlined.Home),
    ELEVES("Élèves", Icons.Filled.School, Icons.Outlined.School),
    GROUPES("Groupes", Icons.Filled.Groups, Icons.Outlined.Groups),
    SEANCES("Séances", Icons.Filled.MenuBook, Icons.Outlined.MenuBook),
    PAIEMENTS("Paiements", Icons.Filled.Payments, Icons.Outlined.Payments),
    NOTES("Notes", Icons.Filled.Notes, Icons.Outlined.Notes, dansBarre = false),
    PARAMETRES("Paramètres", Icons.Filled.Settings, Icons.Outlined.Settings, dansBarre = false)
}

/** Permet aux écrans d'afficher les raccourcis Notes / Paramètres dans leur barre du haut. */
val LocalNavigation = staticCompositionLocalOf<(NavigationTab) -> Unit> { {} }

@Composable
fun MainScreenContainer(viewModel: ProfViewModel) {
    var selectedTab by remember { mutableStateOf(NavigationTab.ACCUEIL) }
    var triggerAddEleveDialogFromAccueil by remember { mutableStateOf(false) }

    CompositionLocalProvider(LocalNavigation provides { tab -> selectedTab = tab }) {
    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = NavigationBarDefaults.Elevation
            ) {
                NavigationTab.entries.filter { it.dansBarre }.forEach { tab ->
                    val isSelected = selectedTab == tab
                    NavigationBarItem(
                        selected = isSelected,
                        onClick = { selectedTab = tab },
                        icon = {
                            Icon(
                                imageVector = if (isSelected) tab.selectedIcon else tab.unselectedIcon,
                                contentDescription = tab.title
                            )
                        },
                        label = {
                            Text(
                                text = tab.title,
                                fontSize = 10.sp,
                                maxLines = 1,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Crossfade(targetState = selectedTab, label = "tab_crossfade") { currentTab ->
                when (currentTab) {
                    NavigationTab.ACCUEIL -> AccueilScreen(
                        viewModel = viewModel,
                        onNavigateToEleves = { selectedTab = NavigationTab.ELEVES },
                        onNavigateToSeances = { selectedTab = NavigationTab.SEANCES },
                        onNavigateToPaiements = { selectedTab = NavigationTab.PAIEMENTS },
                        onAddEleveClick = {
                            triggerAddEleveDialogFromAccueil = true
                            selectedTab = NavigationTab.ELEVES
                        }
                    )
                    NavigationTab.ELEVES -> ElevesScreen(
                        viewModel = viewModel,
                        showAddDialogInitially = triggerAddEleveDialogFromAccueil,
                        onAddDialogDismissed = { triggerAddEleveDialogFromAccueil = false }
                    )
                    NavigationTab.GROUPES -> GroupesScreen(viewModel = viewModel)
                    NavigationTab.SEANCES -> SeancesScreen(viewModel = viewModel)
                    NavigationTab.PAIEMENTS -> PaiementsScreen(viewModel = viewModel)
                    NavigationTab.NOTES -> NotesScreen(viewModel = viewModel)
                    NavigationTab.PARAMETRES -> ParametresScreen(viewModel = viewModel)
                }
            }
        }
    }
}
}
