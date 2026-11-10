import type {
  DeviceManifestPayload,
  MediaAsset,
  Playlist,
  ScheduleRule,
} from "./types.ts";

/**
 * Compila el estado actual de activos multimedia, playlists y horarios en un
 * manifiesto inmutable optimizado para la Google TV.
 * Solo incluye en `assets` los archivos que realmente están referenciados en
 * alguna playlist activa o de respaldo (Garbage Collection desde el origen).
 */
export function compileDeviceManifest(params: {
  nextVersion: number;
  assets: MediaAsset[];
  playlists: Playlist[];
  schedules: ScheduleRule[];
  nowIso?: string;
}): DeviceManifestPayload {
  const { nextVersion, assets, playlists, schedules, nowIso } = params;

  const fallbackPlaylist = playlists.find((p) => p.is_fallback) ?? null;
  const activeSchedules = schedules
    .filter((s) => s.is_active)
    .sort((a, b) => b.priority - a.priority);

  // Identificar qué playlists pueden reproducirse (las programadas + la fallback)
  const referencedPlaylistIds = new Set<string>();
  if (fallbackPlaylist) {
    referencedPlaylistIds.add(fallbackPlaylist.id);
  }
  for (const sched of activeSchedules) {
    referencedPlaylistIds.add(sched.playlist_id);
  }

  // Construir mapa de playlists y recolectar IDs de archivos multimedia requeridos
  const requiredAssetIds = new Set<string>();
  const compiledPlaylists: DeviceManifestPayload["playlists"] = {};

  for (const playlist of playlists) {
    if (!referencedPlaylistIds.has(playlist.id)) continue;

    const sortedItems = [...playlist.items].sort(
      (a, b) => a.display_order - b.display_order
    );

    compiledPlaylists[playlist.id] = sortedItems.map((item, idx) => {
      requiredAssetIds.add(item.media_id);
      return {
        asset_id: item.media_id,
        order: idx + 1,
        duration_sec: item.duration_seconds,
      };
    });
  }

  // Filtrar solo los archivos multimedia requeridos para ahorrar disco en la Google TV
  const compiledAssets = assets
    .filter((a) => requiredAssetIds.has(a.id))
    .map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      url: a.public_url,
      sha256: a.sha256_hash,
      size_bytes: a.size_bytes,
    }));

  return {
    version: nextVersion,
    generated_at: nowIso ?? new Date().toISOString(),
    fallback_playlist_id: fallbackPlaylist ? fallbackPlaylist.id : null,
    assets: compiledAssets,
    playlists: compiledPlaylists,
    schedules: activeSchedules.map((s) => ({
      id: s.id,
      name: s.name,
      playlist_id: s.playlist_id,
      days_of_week: [...s.days_of_week].sort(),
      start_time: s.start_time,
      end_time: s.end_time,
      priority: s.priority,
    })),
  };
}

/**
 * Calcula qué archivos debe descargar y cuáles debe borrar del almacenamiento interno
 * la Google TV al actualizar de un manifiesto anterior a uno nuevo.
 */
export function computeManifestAssetDiff(
  previousManifest: DeviceManifestPayload | null,
  nextManifest: DeviceManifestPayload
): {
  toDownload: DeviceManifestPayload["assets"];
  toDeleteAssetIds: string[];
  unchangedAssetIds: string[];
} {
  const prevMap = new Map<string, string>();
  if (previousManifest) {
    for (const asset of previousManifest.assets) {
      prevMap.set(asset.id, asset.sha256);
    }
  }

  const nextIds = new Set<string>();
  const toDownload: DeviceManifestPayload["assets"] = [];
  const unchangedAssetIds: string[] = [];

  for (const asset of nextManifest.assets) {
    nextIds.add(asset.id);
    const prevHash = prevMap.get(asset.id);
    if (!prevHash || prevHash !== asset.sha256) {
      toDownload.push(asset);
    } else {
      unchangedAssetIds.push(asset.id);
    }
  }

  const toDeleteAssetIds: string[] = [];
  if (previousManifest) {
    for (const prevAsset of previousManifest.assets) {
      if (!nextIds.has(prevAsset.id)) {
        toDeleteAssetIds.push(prevAsset.id);
      }
    }
  }

  return { toDownload, toDeleteAssetIds, unchangedAssetIds };
}

/**
 * Evalúa qué Playlist debe estar reproduciéndose en la TV en una fecha/hora local dada.
 * Esta misma lógica exacta corre en Kotlin dentro de la Google TV en modo Offline.
 */
export function evaluateActivePlaylist(
  manifest: DeviceManifestPayload,
  dayOfWeek: number, // 0=Dom .. 6=Sab
  currentTimeHHmm: string // "HH:mm"
): {
  activePlaylistId: string | null;
  matchedScheduleName: string | null;
  isFallback: boolean;
} {
  const sortedSchedules = [...manifest.schedules].sort(
    (a, b) => b.priority - a.priority
  );

  for (const sched of sortedSchedules) {
    const matchesDay = sched.days_of_week.includes(dayOfWeek);
    if (!matchesDay) continue;

    // Soporta tanto rangos diurnos (08:00 -> 18:00) como cruces de medianoche (22:00 -> 02:00)
    const isOvernight = sched.start_time > sched.end_time;
    const isInTimeWindow = isOvernight
      ? currentTimeHHmm >= sched.start_time || currentTimeHHmm < sched.end_time
      : currentTimeHHmm >= sched.start_time && currentTimeHHmm < sched.end_time;

    if (isInTimeWindow) {
      return {
        activePlaylistId: sched.playlist_id,
        matchedScheduleName: sched.name,
        isFallback: false,
      };
    }
  }

  return {
    activePlaylistId: manifest.fallback_playlist_id,
    matchedScheduleName: null,
    isFallback: true,
  };
}
