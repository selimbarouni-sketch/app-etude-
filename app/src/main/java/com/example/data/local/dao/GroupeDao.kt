package com.example.data.local.dao

import androidx.room.*
import com.example.data.local.entity.GroupeEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface GroupeDao {
    @Query("SELECT * FROM groupes ORDER BY nom ASC")
    fun getAllGroupes(): Flow<List<GroupeEntity>>

    @Query("SELECT * FROM groupes WHERE id = :id LIMIT 1")
    suspend fun getGroupeById(id: Int): GroupeEntity?

    @Query("SELECT * FROM groupes WHERE nom = :nom LIMIT 1")
    suspend fun getGroupeByNom(nom: String): GroupeEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertGroupe(groupe: GroupeEntity): Long

    @Update
    suspend fun updateGroupe(groupe: GroupeEntity)

    @Delete
    suspend fun deleteGroupe(groupe: GroupeEntity)

    @Query("SELECT COUNT(*) FROM groupes")
    suspend fun getGroupeCount(): Int
}
