package com.apptv.player.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

/**
 * Guarda la última versión completamente descargada y verificada del Manifiesto.
 * Si tanto la PC como la Google TV pierden el internet o se reinician,
 * la app lee este registro en el milisegundo 0 al encenderse.
 */
@Entity(tableName = "local_manifests")
data class LocalManifestEntity(
    @PrimaryKey val singletonId: Int = 1,
    val version: Int,
    val payloadJson: String,
    val activatedAtEpochMs: Long
)

/**
 * Mapea cada archivo multimedia a su ruta física en el almacenamiento interno de la Google TV:
 * `/data/user/0/com.apptv.player/files/media/<sha256>.mp4`
 */
@Entity(tableName = "cached_assets")
data class CachedAssetEntity(
    @PrimaryKey val assetId: String,
    val sha256: String,
    val localFilePath: String,
    val sizeBytes: Long,
    val downloadedAtEpochMs: Long
)

/**
 * Guarda la identidad y el código de vinculación de la Google TV.
 */
@Entity(tableName = "device_config")
data class DeviceConfigEntity(
    @PrimaryKey val singletonId: Int = 1,
    val deviceId: String,
    val pairingCode: String,
    val isPaired: Boolean
)

@Dao
interface SignageDao {
    @Query("SELECT * FROM local_manifests WHERE singletonId = 1 LIMIT 1")
    fun observeActiveManifest(): Flow<LocalManifestEntity?>

    @Query("SELECT * FROM local_manifests WHERE singletonId = 1 LIMIT 1")
    suspend fun getActiveManifest(): LocalManifestEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveActiveManifest(manifest: LocalManifestEntity)

    @Query("SELECT * FROM cached_assets")
    suspend fun getAllCachedAssets(): List<CachedAssetEntity>

    @Query("SELECT * FROM cached_assets WHERE assetId = :assetId LIMIT 1")
    suspend fun getCachedAssetById(assetId: String): CachedAssetEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertCachedAsset(asset: CachedAssetEntity)

    @Query("DELETE FROM cached_assets WHERE assetId = :assetId")
    suspend fun deleteCachedAssetById(assetId: String)

    @Query("SELECT * FROM device_config WHERE singletonId = 1 LIMIT 1")
    suspend fun getDeviceConfig(): DeviceConfigEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveDeviceConfig(config: DeviceConfigEntity)
}

@Database(
    entities = [
        LocalManifestEntity::class,
        CachedAssetEntity::class,
        DeviceConfigEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun signageDao(): SignageDao
}
