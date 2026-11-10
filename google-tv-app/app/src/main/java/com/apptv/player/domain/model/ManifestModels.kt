package com.apptv.player.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class MediaType {
    IMAGE,
    VIDEO
}

@Serializable
data class ManifestAsset(
    val id: String,
    val name: String,
    val type: MediaType,
    val url: String,
    val sha256: String,
    @SerialName("size_bytes") val sizeBytes: Long
)

@Serializable
data class ManifestPlaylistItem(
    @SerialName("asset_id") val assetId: String,
    val order: Int,
    @SerialName("duration_sec") val durationSec: Int
)

@Serializable
data class ManifestScheduleRule(
    val id: String,
    val name: String,
    @SerialName("playlist_id") val playlistId: String,
    @SerialName("days_of_week") val daysOfWeek: List<Int>,
    @SerialName("start_time") val startTime: String, // "HH:mm"
    @SerialName("end_time") val endTime: String,     // "HH:mm"
    val priority: Int
)

/**
 * Contrato JSON inmutable del Manifiesto compilado por el Dashboard Web y almacenado localmente en la Google TV.
 */
@Serializable
data class DeviceManifestPayload(
    val version: Int,
    @SerialName("generated_at") val generatedAt: String,
    @SerialName("fallback_playlist_id") val fallbackPlaylistId: String? = null,
    val assets: List<ManifestAsset> = emptyList(),
    val playlists: Map<String, List<ManifestPlaylistItem>> = emptyMap(),
    val schedules: List<ManifestScheduleRule> = emptyList()
)

/**
 * Representa un archivo multimedia ya descargado y verificado en el almacenamiento interno de la Google TV,
 * listo para reproducirse sin conexión a internet.
 */
data class PlayableLocalItem(
    val assetId: String,
    val name: String,
    val type: MediaType,
    val localFilePath: String,
    val durationSeconds: Int
)
