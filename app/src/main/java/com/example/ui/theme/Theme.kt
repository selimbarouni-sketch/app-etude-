package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val LightColorScheme = lightColorScheme(
    primary = PrimaryBlue,
    onPrimary = Color.White,
    primaryContainer = AccentLightBlue,
    onPrimaryContainer = PrimaryBlueVariant,
    secondary = SecondaryBlue,
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
    secondary = SecondaryBlue,
    onSecondary = Color.Black,
    background = NeutralDarkBg,
    onBackground = Color.White,
    surface = NeutralDarkSurface,
    onSurface = Color.White,
    surfaceVariant = NeutralDarkBg,
    onSurfaceVariant = Color(0xFFB0BEC5),
    outline = Color(0xFF424242)
)

@Composable
fun ProfSuiviTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Keep clean brand colors predictable
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
