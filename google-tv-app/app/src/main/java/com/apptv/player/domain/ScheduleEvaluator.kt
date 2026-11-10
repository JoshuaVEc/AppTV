package com.apptv.player.domain

import com.apptv.player.domain.model.DeviceManifestPayload
import com.apptv.player.domain.model.ManifestPlaylistItem

data class ScheduleEvaluationResult(
    val activePlaylistId: String?,
    val matchedScheduleName: String?,
    val isFallback: Boolean,
    val items: List<ManifestPlaylistItem>
)

/**
 * Motor autónomo de evaluación de horarios en la Google TV.
 * No requiere conexión a internet: compara el reloj interno del televisor contra las reglas
 * del último manifiesto persistido en Room Database.
 */
object ScheduleEvaluator {

    /**
     * Evalúa qué playlist corresponde reproducir en el día de la semana (0=Domingo..6=Sábado)
     * y hora local ("HH:mm") actuales.
     */
    fun evaluate(
        manifest: DeviceManifestPayload,
        dayOfWeekZeroSunday: Int,
        currentTimeHHmm: String
    ): ScheduleEvaluationResult {
        val sortedSchedules = manifest.schedules.sortedByDescending { it.priority }

        for (rule in sortedSchedules) {
            if (!rule.daysOfWeek.contains(dayOfWeekZeroSunday)) continue

            val isOvernight = rule.startTime > rule.endTime
            val inWindow = if (isOvernight) {
                currentTimeHHmm >= rule.startTime || currentTimeHHmm < rule.endTime
            } else {
                currentTimeHHmm >= rule.startTime && currentTimeHHmm < rule.endTime
            }

            if (inWindow) {
                val items = manifest.playlists[rule.playlistId]
                    ?.sortedBy { it.order }
                    ?: emptyList()
                return ScheduleEvaluationResult(
                    activePlaylistId = rule.playlistId,
                    matchedScheduleName = rule.name,
                    isFallback = false,
                    items = items
                )
            }
        }

        val fallbackId = manifest.fallbackPlaylistId
        val fallbackItems = if (fallbackId != null) {
            manifest.playlists[fallbackId]?.sortedBy { it.order } ?: emptyList()
        } else {
            emptyList()
        }

        return ScheduleEvaluationResult(
            activePlaylistId = fallbackId,
            matchedScheduleName = null,
            isFallback = true,
            items = fallbackItems
        )
    }
}
