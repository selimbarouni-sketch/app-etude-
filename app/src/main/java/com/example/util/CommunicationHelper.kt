package com.example.util

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast

object CommunicationHelper {

    fun telephoner(context: Context, phone: String) {
        if (phone.isBlank()) return
        val intent = Intent(Intent.ACTION_DIAL).apply {
            data = Uri.parse("tel:$phone")
        }
        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "Impossible d'effectuer l'appel", Toast.LENGTH_SHORT).show()
        }
    }

    fun envoyerSms(context: Context, phone: String, message: String) {
        if (phone.isBlank()) return
        val intent = Intent(Intent.ACTION_SENDTO).apply {
            data = Uri.parse("smsto:$phone")
            putExtra("sms_body", message)
        }
        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "Impossible d'ouvrir l'application SMS", Toast.LENGTH_SHORT).show()
        }
    }

    fun envoyerWhatsapp(context: Context, phone: String, message: String) {
        if (phone.isBlank()) return
        var cleanPhone = phone.filter { it.isDigit() }
        if (cleanPhone.startsWith("00")) cleanPhone = cleanPhone.drop(2)
        // Numéro tunisien local à 8 chiffres : WhatsApp exige l'indicatif pays (216)
        if (cleanPhone.length == 8) cleanPhone = "216$cleanPhone"
        // URLEncoder encode les espaces en "+", que WhatsApp affiche tels quels
        val encodedMessage = Uri.encode(message)
        val uri = Uri.parse("https://api.whatsapp.com/send?phone=$cleanPhone&text=$encodedMessage")
        val intent = Intent(Intent.ACTION_VIEW, uri)
        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "WhatsApp non installé ou numéro invalide", Toast.LENGTH_SHORT).show()
        }
    }

    fun creerGroupeWhatsappHelper(context: Context, phones: List<String>, messagePrefix: String = "") {
        if (phones.isEmpty()) {
            Toast.makeText(context, "Veuillez sélectionner au moins un élève", Toast.LENGTH_SHORT).show()
            return
        }
        val cleanPhones = phones.map { it.replace(" ", "").replace("-", "") }.joinToString(", ")
        
        // Copy list to clipboard for user convenience
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Liste Numéros WhatsApp", cleanPhones)
        clipboard.setPrimaryClip(clip)

        Toast.makeText(context, "${phones.size} numéros copiés dans le presse-papier!", Toast.LENGTH_LONG).show()

        // Launch WhatsApp app
        val intent = context.packageManager.getLaunchIntentForPackage("com.whatsapp")
            ?: context.packageManager.getLaunchIntentForPackage("com.whatsapp.w4b")
            ?: Intent(Intent.ACTION_VIEW, Uri.parse("https://web.whatsapp.com"))
        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "Impossible d'ouvrir WhatsApp", Toast.LENGTH_SHORT).show()
        }
    }

    fun partagerContact(context: Context, nom: String, prenom: String, phone: String, classe: String) {
        val shareText = "Contact Élève :\n$prenom $nom\nClasse : $classe\nTél : $phone"
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, shareText)
        }
        context.startActivity(Intent.createChooser(intent, "Partager le contact"))
    }
}
