package com.example.util

import android.content.Context
import java.security.MessageDigest

/**
 * Code d'accès à l'application (par défaut 1234).
 * Le code n'est jamais stocké en clair : seule son empreinte SHA-256 est enregistrée.
 */
class CodeAcces(context: Context) {
    private val prefs = context.getSharedPreferences("securite", Context.MODE_PRIVATE)

    var actif: Boolean
        get() = prefs.getBoolean("code_actif", true)
        set(v) = prefs.edit().putBoolean("code_actif", v).apply()

    /** true tant que le code n'a jamais été changé (toujours 1234). */
    val estParDefaut: Boolean get() = !prefs.contains("code_hash")

    fun verifier(code: String): Boolean =
        empreinte(code) == (prefs.getString("code_hash", null) ?: empreinte(CODE_PAR_DEFAUT))

    fun changer(nouveau: String) {
        prefs.edit().putString("code_hash", empreinte(nouveau)).apply()
    }

    private fun empreinte(code: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest("profsuivi:$code".toByteArray())
            .joinToString("") { "%02x".format(it) }

    companion object {
        const val CODE_PAR_DEFAUT = "1234"
        fun estValide(code: String) = code.length in 4..8 && code.all { it.isDigit() }
    }
}
