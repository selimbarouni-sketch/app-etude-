package com.example.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.local.entity.EleveEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface EleveDao {
    @Query("SELECT * FROM eleves WHERE isArchived = 0 ORDER BY nom ASC, prenom ASC")
    fun getAllEleves(): Flow<List<EleveEntity>>

    @Query("SELECT * FROM eleves WHERE id = :id")
    fun getEleveById(id: Int): Flow<EleveEntity?>

    @Query("SELECT * FROM eleves WHERE id = :id")
    suspend fun getEleveByIdDirect(id: Int): EleveEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEleve(eleve: EleveEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEleves(eleves: List<EleveEntity>)

    @Update
    suspend fun updateEleve(eleve: EleveEntity)

    /** Place plusieurs élèves dans un groupe (un élève n'appartient qu'à un groupe). */
    @Query("UPDATE eleves SET groupe = :nomGroupe WHERE id IN (:ids)")
    suspend fun affecterAuGroupe(ids: List<Int>, nomGroupe: String)

    @Query("UPDATE eleves SET groupe = NULL WHERE id = :eleveId")
    suspend fun retirerDuGroupe(eleveId: Int)

    /** Renommer un groupe : ses élèves suivent. Avec nouveauNom NULL, ils deviennent "sans groupe". */
    @Query("UPDATE eleves SET groupe = :nouveauNom WHERE groupe = :ancienNom COLLATE NOCASE")
    suspend fun renommerGroupe(ancienNom: String, nouveauNom: String?)

    @Delete
    suspend fun deleteEleve(eleve: EleveEntity)

    @Query("UPDATE eleves SET sessionsInCurrentCycle = sessionsInCurrentCycle + 1, totalSeancesRealisees = totalSeancesRealisees + 1 WHERE id = :eleveId")
    suspend fun incrementSessionCount(eleveId: Int)

    @Query("UPDATE eleves SET sessionsInCurrentCycle = MAX(sessionsInCurrentCycle - 1, 0), totalSeancesRealisees = MAX(totalSeancesRealisees - 1, 0) WHERE id = :eleveId")
    suspend fun decrementSessionCount(eleveId: Int)

    /** Retire du cycle les séances payées (au lieu de tout remettre à 0). */
    @Query("UPDATE eleves SET sessionsInCurrentCycle = MAX(sessionsInCurrentCycle - :nbSeances, 0) WHERE id = :eleveId")
    suspend fun deduireSeancesPayees(eleveId: Int, nbSeances: Int)
}
