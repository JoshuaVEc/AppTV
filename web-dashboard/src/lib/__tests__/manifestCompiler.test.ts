import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compileDeviceManifest,
  computeManifestAssetDiff,
  evaluateActivePlaylist,
} from "../manifestCompiler.ts";
import type { MediaAsset, Playlist, ScheduleRule } from "../types.ts";

const sampleAssets: MediaAsset[] = [
  {
    id: "asset-1",
    name: "morning.jpg",
    type: "IMAGE",
    mime_type: "image/jpeg",
    storage_path: "media/morning.jpg",
    public_url: "https://cdn.example.com/morning.jpg",
    sha256_hash: "aaaa1111",
    size_bytes: 1000,
    duration_seconds: 10,
    created_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "asset-2",
    name: "promo.mp4",
    type: "VIDEO",
    mime_type: "video/mp4",
    storage_path: "media/promo.mp4",
    public_url: "https://cdn.example.com/promo.mp4",
    sha256_hash: "bbbb2222",
    size_bytes: 5000,
    duration_seconds: 20,
    created_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "asset-unused",
    name: "unused.png",
    type: "IMAGE",
    mime_type: "image/png",
    storage_path: "media/unused.png",
    public_url: "https://cdn.example.com/unused.png",
    sha256_hash: "cccc3333",
    size_bytes: 2000,
    duration_seconds: 8,
    created_at: "2026-11-10T00:00:00Z",
  },
];

const samplePlaylists: Playlist[] = [
  {
    id: "pl-fallback",
    name: "Default",
    is_fallback: true,
    items: [
      {
        id: "i1",
        playlist_id: "pl-fallback",
        media_id: "asset-1",
        display_order: 1,
        duration_seconds: 10,
      },
    ],
  },
  {
    id: "pl-morning",
    name: "Morning",
    is_fallback: false,
    items: [
      {
        id: "i2",
        playlist_id: "pl-morning",
        media_id: "asset-2",
        display_order: 1,
        duration_seconds: 20,
      },
    ],
  },
];

const sampleSchedules: ScheduleRule[] = [
  {
    id: "s-morning",
    name: "Mañanas L-V",
    playlist_id: "pl-morning",
    days_of_week: [1, 2, 3, 4, 5],
    start_time: "08:00",
    end_time: "12:00",
    priority: 10,
    is_active: true,
  },
];

describe("compileDeviceManifest & Offline Schedule Evaluator", () => {
  it("excluye archivos multimedia no referenciados en playlists activas para ahorrar memoria en Google TV", () => {
    const manifest = compileDeviceManifest({
      nextVersion: 5,
      assets: sampleAssets,
      playlists: samplePlaylists,
      schedules: sampleSchedules,
      nowIso: "2026-11-10T10:00:00Z",
    });

    assert.equal(manifest.version, 5);
    assert.equal(manifest.assets.length, 2);
    assert.equal(
      manifest.assets.some((a) => a.id === "asset-unused"),
      false
    );
  });

  it("selecciona la playlist programada dentro del rango de horario y cae en fallback fuera de horario", () => {
    const manifest = compileDeviceManifest({
      nextVersion: 1,
      assets: sampleAssets,
      playlists: samplePlaylists,
      schedules: sampleSchedules,
    });

    // Lunes (1) a las 09:30 -> Debe activar "pl-morning"
    const activeEval = evaluateActivePlaylist(manifest, 1, "09:30");
    assert.equal(activeEval.activePlaylistId, "pl-morning");
    assert.equal(activeEval.isFallback, false);

    // Lunes (1) a las 15:00 -> Fuera de horario -> Debe activar "pl-fallback"
    const fallbackEval = evaluateActivePlaylist(manifest, 1, "15:00");
    assert.equal(fallbackEval.activePlaylistId, "pl-fallback");
    assert.equal(fallbackEval.isFallback, true);

    // Domingo (0) a las 09:30 -> No aplica horario de L-V -> Debe activar "pl-fallback"
    const sundayEval = evaluateActivePlaylist(manifest, 0, "09:30");
    assert.equal(sundayEval.activePlaylistId, "pl-fallback");
    assert.equal(sundayEval.isFallback, true);
  });

  it("calcula correctamente los archivos nuevos a descargar y los eliminados para Garbage Collection en la TV", () => {
    const v1 = compileDeviceManifest({
      nextVersion: 1,
      assets: sampleAssets,
      playlists: samplePlaylists,
      schedules: sampleSchedules,
    });

    // En v2 eliminamos el horario de la mañana, por lo que "asset-2" ya no se necesita en disco
    const v2 = compileDeviceManifest({
      nextVersion: 2,
      assets: sampleAssets,
      playlists: samplePlaylists,
      schedules: [],
    });

    const diff = computeManifestAssetDiff(v1, v2);
    assert.deepEqual(diff.toDeleteAssetIds, ["asset-2"]);
    assert.deepEqual(diff.unchangedAssetIds, ["asset-1"]);
    assert.equal(diff.toDownload.length, 0);
  });
});
