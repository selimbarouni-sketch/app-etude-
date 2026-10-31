package com.example.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Update
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.data.local.entity.PaiementEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PaiementDao {
    @Query("SELECT * FROM paiements ORDER BY dateEpochMs DESC")
    fun getAllPaiements(): Flow<List<PaiementEntity>>

    @Query("SELECT * FROM paiements WHERE eleveId = :eleveId ORDER BY dateEpochMs DESC")
    fun getPaiementsForEleve(eleveId: Int): Flow<List<PaiementEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPaiement(paiement: PaiementEntity): Long

    @Update
    suspend fun updatePaiement(paiement: PaiementEntity)

    @Delete
    suspend fun deletePaiement(paiement: PaiementEntity)

    @Query("SELECT * FROM paiements WHERE id = :id")
    suspend fun getPaiementById(id: Int): PaiementEntity?
}
