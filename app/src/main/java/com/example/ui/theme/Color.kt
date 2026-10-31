package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Palette « Classique » : bleu moderne
val ClassiqueBlue = Color(0xFF1565C0)
val PrimaryBlueVariant = Color(0xFF0D47A1)
val ClassiqueSecondary = Color(0xFF0288D1)

// Les écrans utilisent ces deux couleurs : elles suivent maintenant le thème
// actif (Classique ou Chic) au lieu d'être toujours bleues.
val PrimaryBlue: Color @Composable get() = MaterialTheme.colorScheme.primary
val SecondaryBlue: Color @Composable get() = MaterialTheme.colorScheme.secondary
val AccentLightBlue = Color(0xFFE3F2FD)

val NeutralLightBg = Color(0xFFF8F9FA)
val NeutralSurface = Color(0xFFFFFFFF)
val NeutralBorder = Color(0xFFE0E0E0)
val NeutralTextPrimary = Color(0xFF1C1B1F)
val NeutralTextSecondary = Color(0xFF616161)

val StatusGreen = Color(0xFF2E7D32)
val StatusGreenBg = Color(0xFFE8F5E9)
val StatusRed = Color(0xFFC62828)
val StatusRedBg = Color(0xFFFFEBEE)
val StatusOrange = Color(0xFFEF6C00)
val StatusOrangeBg = Color(0xFFFFF3E0)

// Dark mode variants
val PrimaryBlueDark = Color(0xFF90CAF9)
val NeutralDarkBg = Color(0xFF121212)
val NeutralDarkSurface = Color(0xFF1E1E1E)

// Palette « Chic » : ivoire, bleu nuit et or
val ChicNuit = Color(0xFF1F2A44)
val ChicOr = Color(0xFFB08D57)
val ChicOrClair = Color(0xFFC9A96E)
val ChicIvoire = Color(0xFFF7F3EC)
val ChicSurface = Color(0xFFFFFDF9)
val ChicSurface2 = Color(0xFFF1EBE0)
val ChicBordure = Color(0xFFE6DCCB)
val ChicTexte = Color(0xFF1F1D1A)
val ChicTexteDoux = Color(0xFF7A7266)
val ChicNoir = Color(0xFF121212)
val ChicSurfaceSombre = Color(0xFF1B1A18)
val ChicSurfaceSombre2 = Color(0xFF24221F)
