package com.example.util

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.example.MainActivity
import com.example.R

class RendezVousAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val title = intent.getStringExtra("title") ?: "Rappel Rendez-vous"
        val message = intent.getStringExtra("message") ?: "Vous avez un cours bientôt."

        NotificationHelper.createNotificationChannel(context)

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, NotificationHelper.CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())

        // Rappel hebdomadaire d'un groupe : on programme déjà celui de la semaine suivante
        val groupeId = intent.getIntExtra("groupe_id", -1)
        if (groupeId >= 0) {
            val prochain = intent.getLongExtra("declenchement", 0L) + 7L * 24 * 60 * 60 * 1000
            NotificationHelper.programmerRappelGroupe(
                context, groupeId,
                intent.getStringExtra("groupe_nom") ?: "",
                intent.getStringExtra("groupe_heure") ?: "",
                intent.getStringExtra("groupe_lieu") ?: "",
                prochain
            )
        }
    }
}

object NotificationHelper {

    const val CHANNEL_ID = "prof_suivi_notifications"
    private const val CHANNEL_NAME = "Rappels Cours & Rendez-vous"

    fun annulerNotificationRendezVous(context: Context, rdvId: Int) {
        val intent = Intent(context, RendezVousAlarmReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context, rdvId, intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        ) ?: return
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingIntent)
        pendingIntent.cancel()
    }

    private const val BASE_ID_GROUPE = 1_000_000

    /** Rappel 1 h avant le cours hebdomadaire d'un groupe (se reprogramme chaque semaine). */
    fun programmerRappelGroupe(context: Context, groupeId: Int, nom: String, heure: String, lieu: String, declenchementMs: Long) {
        if (declenchementMs <= System.currentTimeMillis()) return
        val intent = Intent(context, RendezVousAlarmReceiver::class.java).apply {
            putExtra("title", "Cours dans 1 h : $nom")
            putExtra("message", "À $heure" + if (lieu.isNotBlank()) " · $lieu" else "")
            putExtra("groupe_id", groupeId)
            putExtra("groupe_nom", nom)
            putExtra("groupe_heure", heure)
            putExtra("groupe_lieu", lieu)
            putExtra("declenchement", declenchementMs)
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context, BASE_ID_GROUPE + groupeId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
        try {
            if (canExact) alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, declenchementMs, pendingIntent)
            else alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, declenchementMs, pendingIntent)
        } catch (e: SecurityException) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, declenchementMs, pendingIntent)
        }
    }

    fun annulerRappelGroupe(context: Context, groupeId: Int) = annulerNotificationRendezVous(context, BASE_ID_GROUPE + groupeId)

    /** Notification immédiate : un élève a atteint le nombre de séances à payer. */
    fun notifierPaiementAttendu(context: Context, eleveId: Int, nom: String, nbSeances: Int) {
        createNotificationChannel(context)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notif = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Paiement attendu : $nom")
            .setContentText("$nom a atteint $nbSeances séances. Pensez à encaisser.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        try {
            (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(2_000_000 + eleveId, notif)
        } catch (e: SecurityException) {
            // autorisation de notification refusée
        }
    }

    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications pour les cours, rendez-vous et paiements"
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    fun programmerNotificationRendezVous(
        context: Context,
        rdvId: Int,
        nomEleve: String,
        heure: String,
        triggerTimeEpochMs: Long
    ) {
        if (triggerTimeEpochMs <= System.currentTimeMillis()) return

        val intent = Intent(context, RendezVousAlarmReceiver::class.java).apply {
            putExtra("title", "Rappel Cours : $nomEleve")
            putExtra("message", "Cours prévu à $heure")
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            rdvId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        // Android 12+ : sans l'autorisation "alarmes exactes", setExact… lève une SecurityException
        // et le rappel était silencieusement perdu. On bascule alors sur une alarme approximative.
        val canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()
        try {
            if (canExact) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeEpochMs, pendingIntent)
            } else {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeEpochMs, pendingIntent)
            }
        } catch (e: SecurityException) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeEpochMs, pendingIntent)
        }
    }
}
