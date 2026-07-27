package com.example.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.local.entity.RendezVousEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface RendezVousDao {
    @Query("SELECT * FROM rendez_vous ORDER BY dateEpochMs ASC")
    fun getAllRendezVous(): Flow<List<RendezVousEntity>>

    @Query("SELECT * FROM rendez_vous WHERE dateEpochMs >= :startMs AND dateEpochMs <= :endMs ORDER BY heure ASC")
    fun getRendezVousAujourdhui(startMs: Long, endMs: Long): Flow<List<RendezVousEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRendezVous(rdv: RendezVousEntity): Long

    @Update
    suspend fun updateRendezVous(rdv: RendezVousEntity)

    @Delete
    suspend fun deleteRendezVous(rdv: RendezVousEntity)
}
