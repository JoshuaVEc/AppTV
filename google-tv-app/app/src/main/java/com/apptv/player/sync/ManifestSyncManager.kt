package com.apptv.player.sync

import android.content.Context
import com.apptv.player.data.local.CachedAssetEntity
import com.apptv.player.data.local.LocalManifestEntity
import com.apptv.player.data.local.SignageDao
import com.apptv.player.domain.model.DeviceManifestPayload
import com.apptv.player.domain.model.ManifestAsset
import com.apptv.player.domain.model.MediaType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.MessageDigest

/**
 * Motor de Sincronización Atómica y Recolector de Basura (Garbage Collector) en la Google TV.
 *
 * Garantías de Ingeniería Senior:
 * 1. Si se corta el internet a mitad de la descarga de un video pesado, se escribe primero en `.part`.
 * 2. Verifica que el hash SHA-256 del archivo descargado coincida exactamente con el del Manifiesto.
 * 3. La TV NUNCA cambia al nuevo manifiesto hasta que el 100% de sus archivos estén en disco local.
 * 4. Una vez activado el nuevo manifiesto, borra automáticamente del disco del TV los videos o imágenes
 *    que fueron eliminados en el Dashboard de la PC.
 */
class ManifestSyncManager(
    private val context: Context,
    private val dao: SignageDao,
    private val httpClient: OkHttpClient = OkHttpClient()
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val mediaDir: File by lazy {
        File(context.filesDir, "media").apply {
            if (!exists()) mkdirs()
        }
    }

    /**
     * Aplica un nuevo manifiesto recibido desde Supabase Realtime o WorkManager Pull.
     * Retorna `true` si la sincronización y verificación de todos los archivos fue exitosa.
     */
    suspend fun syncManifestAtomically(remoteManifest: DeviceManifestPayload): Boolean =
        withContext(Dispatchers.IO) {
            val currentLocal = dao.getActiveManifest()
            if (currentLocal != null && currentLocal.version >= remoteManifest.version) {
                return@withContext true // Ya estamos al día
            }

            // Paso 1: Descargar y verificar con SHA-256 todos los archivos requeridos por la nueva versión
            for (asset in remoteManifest.assets) {
                val existing = dao.getCachedAssetById(asset.id)
                val existingFile = existing?.let { File(it.localFilePath) }

                val alreadyValidOnDisk = existing != null &&
                    existing.sha256.equals(asset.sha256, ignoreCase = true) &&
                    existingFile != null &&
                    existingFile.exists()

                if (!alreadyValidOnDisk) {
                    val downloadedFile = downloadAndVerifyAsset(asset)
                        ?: return@withContext false // Si falla la red, abortamos sin romper el manifiesto actual

                    dao.upsertCachedAsset(
                        CachedAssetEntity(
                            assetId = asset.id,
                            sha256 = asset.sha256,
                            localFilePath = downloadedFile.absolutePath,
                            sizeBytes = asset.sizeBytes,
                            downloadedAtEpochMs = System.currentTimeMillis()
                        )
                    )
                }
            }

            // Paso 2: Commit Atómico del Manifiesto en Room Database
            val serialized = json.encodeToString(remoteManifest)
            dao.saveActiveManifest(
                LocalManifestEntity(
                    singletonId = 1,
                    version = remoteManifest.version,
                    payloadJson = serialized,
                    activatedAtEpochMs = System.currentTimeMillis()
                )
            )

            // Paso 3: Garbage Collection de archivos eliminados en el Dashboard para liberar memoria en la TV
            runMediaGarbageCollection(remoteManifest.assets.map { it.id }.toSet())

            true
        }

    private fun downloadAndVerifyAsset(asset: ManifestAsset): File? {
        val extension = if (asset.type == MediaType.VIDEO) "mp4" else "jpg"
        val tempFile = File(mediaDir, "${asset.sha256}.part")
        val finalFile = File(mediaDir, "${asset.sha256}.$extension")

        return try {
            val request = Request.Builder().url(asset.url).build()
            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return null
                val body = response.body ?: return null

                FileOutputStream(tempFile).use { output ->
                    body.byteStream().copyTo(output)
                }
            }

            val computedHash = computeSha256Hex(tempFile)
            if (!computedHash.equals(asset.sha256, ignoreCase = true)) {
                tempFile.delete()
                return null
            }

            if (finalFile.exists()) finalFile.delete()
            if (!tempFile.renameTo(finalFile)) {
                tempFile.copyTo(finalFile, overwrite = true)
                tempFile.delete()
            }
            finalFile
        } catch (e: Exception) {
            tempFile.delete()
            null
        }
    }

    private suspend fun runMediaGarbageCollection(activeAssetIds: Set<String>) {
        val allCached = dao.getAllCachedAssets()
        for (cached in allCached) {
            if (!activeAssetIds.contains(cached.assetId)) {
                runCatching {
                    val obsoleteFile = File(cached.localFilePath)
                    if (obsoleteFile.exists()) {
                        obsoleteFile.delete()
                    }
                    dao.deleteCachedAssetById(cached.assetId)
                }
            }
        }
    }

    companion object {
        fun computeSha256Hex(file: File): String {
            val digest = MessageDigest.getInstance("SHA-256")
            FileInputStream(file).use { fis ->
                val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                var read = fis.read(buffer)
                while (read > -1) {
                    digest.update(buffer, 0, read)
                    read = fis.read(buffer)
                }
            }
            return digest.digest().joinToString("") { "%02x".format(it) }
        }
    }
}
