package com.example.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.local.entity.DossierNoteEntity
import com.example.data.local.entity.NoteEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface NoteDao {
    @Query("SELECT * FROM notes ORDER BY dateEpochMs DESC")
    fun getAllNotes(): Flow<List<NoteEntity>>

    @Query("SELECT * FROM notes WHERE dossierId = :dossierId ORDER BY dateEpochMs DESC")
    fun getNotesByDossier(dossierId: Int): Flow<List<NoteEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertNote(note: NoteEntity): Long

    @Update
    suspend fun updateNote(note: NoteEntity)

    @Delete
    suspend fun deleteNote(note: NoteEntity)

    @Query("SELECT * FROM dossiers_notes ORDER BY nom ASC")
    fun getAllDossiers(): Flow<List<DossierNoteEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDossier(dossier: DossierNoteEntity): Long

    @Delete
    suspend fun deleteDossier(dossier: DossierNoteEntity)

    /** Les notes d'un dossier supprimé restaient orphelines et invisibles dans les onglets. */
    @Query("UPDATE notes SET dossierId = NULL WHERE dossierId = :dossierId")
    suspend fun detacherNotesDuDossier(dossierId: Int)
}
