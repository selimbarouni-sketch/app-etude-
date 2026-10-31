package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.data.local.dao.EleveDao
import com.example.data.local.dao.GroupeDao
import com.example.data.local.dao.NoteDao
import com.example.data.local.dao.PaiementDao
import com.example.data.local.dao.RendezVousDao
import com.example.data.local.dao.SeanceDao
import com.example.data.local.dao.SettingsDao
import com.example.data.local.entity.DossierNoteEntity
import com.example.data.local.entity.EleveEntity
import com.example.data.local.entity.GroupeEntity
import com.example.data.local.entity.NoteEntity
import com.example.data.local.entity.PaiementEntity
import com.example.data.local.entity.RendezVousEntity
import com.example.data.local.entity.SeanceEntity
import com.example.data.local.entity.SettingsEntity

@Database(
    entities = [
        EleveEntity::class,
        GroupeEntity::class,
        RendezVousEntity::class,
        SeanceEntity::class,
        PaiementEntity::class,
        NoteEntity::class,
        DossierNoteEntity::class,
        SettingsEntity::class
    ],
    version = 3,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun eleveDao(): EleveDao
    abstract fun groupeDao(): GroupeDao
    abstract fun rendezVousDao(): RendezVousDao
    abstract fun seanceDao(): SeanceDao
    abstract fun paiementDao(): PaiementDao
    abstract fun noteDao(): NoteDao
    abstract fun settingsDao(): SettingsDao

    companion object {
        const val DB_NAME = "prof_suivi_db"

        /** Version 3 : séances annulées et statut « encaissé » des paiements (données conservées). */
        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE rendez_vous ADD COLUMN estAnnule INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE paiements ADD COLUMN estEncaisse INTEGER NOT NULL DEFAULT 1")
            }
        }

        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DB_NAME
                )
                .addMigrations(MIGRATION_2_3)
                // ATTENTION : si un jour on change le schéma (version 3…), il faudra écrire
                // une Migration, sinon cette option efface toutes les données de l'utilisateur.
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
