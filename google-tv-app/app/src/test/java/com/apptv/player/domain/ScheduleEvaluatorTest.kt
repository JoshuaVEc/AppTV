package com.apptv.player.domain

import com.apptv.player.domain.model.DeviceManifestPayload
import com.apptv.player.domain.model.ManifestPlaylistItem
import com.apptv.player.domain.model.ManifestScheduleRule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ScheduleEvaluatorTest {

    private val testManifest = DeviceManifestPayload(
        version = 10,
        generatedAt = "2026-11-10T00:00:00Z",
        fallbackPlaylistId = "pl-fallback",
        playlists = mapOf(
            "pl-fallback" to listOf(
                ManifestPlaylistItem(assetId = "asset-default", order = 1, durationSec = 10)
            ),
            "pl-morning" to listOf(
                ManifestPlaylistItem(assetId = "asset-breakfast", order = 1, durationSec = 15)
            ),
            "pl-vip-override" to listOf(
                ManifestPlaylistItem(assetId = "asset-vip", order = 1, durationSec = 30)
            )
        ),
        schedules = listOf(
            ManifestScheduleRule(
                id = "sched-morning",
                name = "Mañana Regular",
                playlistId = "pl-morning",
                daysOfWeek = listOf(1, 2, 3, 4, 5),
                startTime = "08:00",
                endTime = "12:00",
                priority = 10
            ),
            ManifestScheduleRule(
                id = "sched-vip",
                name = "Evento Especial Alta Prioridad",
                playlistId = "pl-vip-override",
                daysOfWeek = listOf(1),
                startTime = "09:00",
                endTime = "10:00",
                priority = 50
            )
        )
    )

    @Test
    fun `selecciona horario de mayor prioridad cuando dos bloques horarios se solapan`() {
        // Lunes (1) a las 09:30 coincide tanto con "Mañana Regular" (prio 10) como con "Evento Especial" (prio 50)
        val result = ScheduleEvaluator.evaluate(testManifest, dayOfWeekZeroSunday = 1, currentTimeHHmm = "09:30")
        assertEquals("pl-vip-override", result.activePlaylistId)
        assertFalse(result.isFallback)
        assertEquals("asset-vip", result.items.first().assetId)
    }

    @Test
    fun `cae automaticamente en la playlist fallback cuando no hay horario programado`() {
        // Domingo (0) a las 18:00 -> Fallback
        val result = ScheduleEvaluator.evaluate(testManifest, dayOfWeekZeroSunday = 0, currentTimeHHmm = "18:00")
        assertEquals("pl-fallback", result.activePlaylistId)
        assertTrue(result.isFallback)
        assertEquals("asset-default", result.items.first().assetId)
    }
}
