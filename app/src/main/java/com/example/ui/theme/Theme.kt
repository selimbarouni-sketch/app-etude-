package com.example.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val LightColorScheme = lightColorScheme(
    primary = ClassiqueBlue,
    onPrimary = Color.White,
    primaryContainer = AccentLightBlue,
    onPrimaryContainer = PrimaryBlueVariant,
    secondary = ClassiqueSecondary,
    onSecondary = Color.White,
    background = NeutralLightBg,
    onBackground = NeutralTextPrimary,
    surface = NeutralSurface,
    onSurface = NeutralTextPrimary,
    surfaceVariant = NeutralLightBg,
    onSurfaceVariant = NeutralTextSecondary,
    outline = NeutralBorder
)

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryBlueDark,
    onPrimary = Color.Black,
    primaryContainer = PrimaryBlueVariant,
    onPrimaryContainer = Color.White,
    secondary = ClassiqueSecondary,
    onSecondary = Color.Black,
    background = NeutralDarkBg,
    onBackground = Color.White,
    surface = NeutralDarkSurface,
    onSurface = Color.White,
    surfaceVariant = NeutralDarkBg,
    onSurfaceVariant = Color(0xFFB0BEC5),
    outline = Color(0xFF424242)
)

// ---------- Style « Chic » ----------
private val ChicLightColorScheme = lightColorScheme(
    primary = ChicNuit,
    onPrimary = Color(0xFFFDF8EF),
    primaryContainer = ChicSurface2,
    onPrimaryContainer = ChicTexte,
    secondary = ChicOr,
    onSecondary = Color.White,
    tertiary = ChicOr,
    background = ChicIvoire,
    onBackground = ChicTexte,
    surface = ChicSurface,
    onSurface = ChicTexte,
    surfaceVariant = ChicSurface2,
    onSurfaceVariant = ChicTexteDoux,
    surfaceContainer = ChicSurface,
    surfaceContainerLow = ChicSurface,
    surfaceContainerHigh = ChicSurface,
    outline = ChicBordure
)

private val ChicDarkColorScheme = darkColorScheme(
    primary = ChicOrClair,
    onPrimary = ChicSurfaceSombre,
    primaryContainer = ChicSurfaceSombre2,
    onPrimaryContainer = Color(0xFFF1EBE0),
    secondary = ChicOrClair,
    onSecondary = ChicSurfaceSombre,
    tertiary = ChicOrClair,
    background = ChicNoir,
    onBackground = Color(0xFFF1EBE0),
    surface = ChicSurfaceSombre,
    onSurface = Color(0xFFF1EBE0),
    surfaceVariant = ChicSurfaceSombre2,
    onSurfaceVariant = Color(0xFFA89F90),
    surfaceContainer = ChicSurfaceSombre,
    surfaceContainerLow = ChicSurfaceSombre,
    surfaceContainerHigh = ChicSurfaceSombre2,
    outline = Color(0xFF34302A)
)

// Angles plus fins pour le style Chic
private val ChicShapes = Shapes(
    extraSmall = RoundedCornerShape(2.dp),
    small = RoundedCornerShape(4.dp),
    medium = RoundedCornerShape(6.dp),
    large = RoundedCornerShape(8.dp),
    extraLarge = RoundedCornerShape(12.dp)
)

@Composable
fun ProfSuiviTheme(
    darkTheme: Boolean = false,
    chic: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        chic && darkTheme -> ChicDarkColorScheme
        chic -> ChicLightColorScheme
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = if (chic) ChicTypography else Typography,
        shapes = if (chic) ChicShapes else Shapes(),
        content = content
    )
}
