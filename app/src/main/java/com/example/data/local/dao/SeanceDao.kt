package com.example.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.example.data.local.entity.SeanceEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SeanceDao {
    @Query("SELECT * FROM seances ORDER BY dateEpochMs DESC")
    fun getAllSeances(): Flow<List<SeanceEntity>>

    @Query("SELECT * FROM seances WHERE eleveId = :eleveId ORDER BY dateEpochMs DESC")
    fun getSeancesForEleve(eleveId: Int): Flow<List<SeanceEntity>>

    @Query("SELECT * FROM seances WHERE dateEpochMs >= :startMs AND dateEpochMs <= :endMs")
    fun getSeancesAujourdhui(startMs: Long, endMs: Long): Flow<List<SeanceEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSeance(seance: SeanceEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSeances(seances: List<SeanceEntity>)

    @Delete
    suspend fun deleteSeance(seance: SeanceEntity)
}
