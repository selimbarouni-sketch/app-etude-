package com.example.data.local.dao

import androidx.room.Dao
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
}
