package com.example

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.example.ui.navigation.MainScreenContainer
import com.example.ui.screens.VerrouillageScreen
import com.example.ui.theme.ProfSuiviTheme
import com.example.ui.viewmodel.ProfViewModel
import com.example.util.NotificationHelper

class MainActivity : ComponentActivity() {

    private val viewModel: ProfViewModel by viewModels()

    private val demandePermissionNotifications =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Create Notification Channel for Reminders
        NotificationHelper.createNotificationChannel(this)

        // Android 13+ : sans cette autorisation, aucun rappel ne s'affiche
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            demandePermissionNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        setContent {
            val settings by viewModel.settings.collectAsState()
            // Le choix fait dans Paramètres s'applique (avant, impossible de repasser
            // en clair si le téléphone était en mode sombre)
            val useDarkTheme = settings.modeSombre
            val chic by viewModel.styleChic.collectAsState()

            ProfSuiviTheme(darkTheme = useDarkTheme, chic = chic) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val verrouille by viewModel.verrouille.collectAsState()
                    if (verrouille) {
                        VerrouillageScreen(
                            codeParDefaut = viewModel.codeParDefaut,
                            onValider = { viewModel.deverrouiller(it) }
                        )
                    } else {
                        MainScreenContainer(viewModel = viewModel)
                    }
                }
            }
        }
    }

    // Verrouillage après 2 minutes passées hors de l'application
    // (pas immédiatement, pour ne pas redemander le code après un partage WhatsApp, etc.)
    private var quitteeA = 0L

    override fun onStop() {
        super.onStop()
        quitteeA = System.currentTimeMillis()
    }

    override fun onStart() {
        super.onStart()
        if (quitteeA > 0 && System.currentTimeMillis() - quitteeA > 2 * 60 * 1000) viewModel.verrouiller()
    }
}
