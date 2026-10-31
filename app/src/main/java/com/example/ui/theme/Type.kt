package com.example.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Set of Material typography styles to start with
val Typography =
  Typography(
    bodyLarge =
      TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp,
      )
    /* Other default text styles to override
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        letterSpacing = 0.sp
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp
    )
    */
  )

// Style « Chic » : titres à empattements (serif), texte aéré
private val base = Typography()
private val Titre = FontFamily.Serif

val ChicTypography = Typography(
    displayLarge = base.displayLarge.copy(fontFamily = Titre),
    displayMedium = base.displayMedium.copy(fontFamily = Titre),
    displaySmall = base.displaySmall.copy(fontFamily = Titre),
    headlineLarge = base.headlineLarge.copy(fontFamily = Titre),
    headlineMedium = base.headlineMedium.copy(fontFamily = Titre),
    headlineSmall = base.headlineSmall.copy(fontFamily = Titre),
    titleLarge = base.titleLarge.copy(fontFamily = Titre, letterSpacing = 0.3.sp),
    titleMedium = base.titleMedium.copy(fontFamily = Titre),
    bodyLarge = base.bodyLarge.copy(letterSpacing = 0.4.sp),
    labelLarge = base.labelLarge.copy(letterSpacing = 1.2.sp, fontWeight = FontWeight.Medium),
)
