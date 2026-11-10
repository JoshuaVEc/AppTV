"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type {
  DeviceManifestPayload,
  MediaAsset,
  Playlist,
  ScheduleRule,
  TvDevice,
} from "./types";
import { compileDeviceManifest } from "./manifestCompiler";
import { computeFileSha256, extractMediaDurationSeconds } from "./hashUtils";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

interface DashboardState {
  assets: MediaAsset[];
  playlists: Playlist[];
  schedules: ScheduleRule[];
  devices: TvDevice[];
  publishedManifest: DeviceManifestPayload;
  hasUnpublishedChanges: boolean;
  isPublishing: boolean;
  isCloudConnected: boolean;
  uploadMediaFile: (file: File) => Promise<void>;
  deleteMediaAsset: (assetId: string) => Promise<void>;
  createPlaylist: (name: string, description: string, isFallback: boolean) => void;
  deletePlaylist: (playlistId: string) => void;
  setFallbackPlaylist: (playlistId: string) => void;
  addAssetToPlaylist: (playlistId: string, assetId: string, durationSec?: number) => void;
  removeItemFromPlaylist: (playlistId: string, itemId: string) => void;
  updatePlaylistItemDuration: (playlistId: string, itemId: string, durationSec: number) => void;
  movePlaylistItem: (playlistId: string, itemId: string, direction: "UP" | "DOWN") => void;
  createSchedule: (rule: Omit<ScheduleRule, "id">) => void;
  toggleScheduleActive: (scheduleId: string) => void;
  deleteSchedule: (scheduleId: string) => void;
  pairDeviceByCode: (deviceCode: string, name: string, location: string) => void;
  simulateDeviceOfflineToggle: (deviceId: string) => void;
  publishToTvs: () => Promise<DeviceManifestPayload>;
}

const STORAGE_KEY = "apptv_dashboard_state_v1";

const INITIAL_ASSETS: MediaAsset[] = [
  {
    id: "asset-img-breakfast",
    name: "menu-desayuno-4k.jpg",
    type: "IMAGE",
    mime_type: "image/jpeg",
    storage_path: "media/menu-desayuno-4k.jpg",
    public_url: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1280&q=80",
    sha256_hash: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    size_bytes: 2_450_120,
    duration_seconds: 10,
    created_at: new Date().toISOString(),
  },
  {
    id: "asset-vid-promo",
    name: "spot-promocional-tarde.mp4",
    type: "VIDEO",
    mime_type: "video/mp4",
    storage_path: "media/spot-promocional-tarde.mp4",
    public_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    sha256_hash: "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
    size_bytes: 14_820_400,
    duration_seconds: 15,
    created_at: new Date().toISOString(),
  },
  {
    id: "asset-img-welcome",
    name: "cartel-bienvenida-corporativo.png",
    type: "IMAGE",
    mime_type: "image/png",
    storage_path: "media/cartel-bienvenida-corporativo.png",
    public_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&q=80",
    sha256_hash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    size_bytes: 1_890_000,
    duration_seconds: 12,
    created_at: new Date().toISOString(),
  },
];

const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: "pl-general-fallback",
    name: "Programación Continua (Fallback)",
    description: "Se reproduce automáticamente cuando no hay otro horario específico activo",
    is_fallback: true,
    items: [
      {
        id: "item-1",
        playlist_id: "pl-general-fallback",
        media_id: "asset-img-welcome",
        display_order: 1,
        duration_seconds: 12,
      },
      {
        id: "item-2",
        playlist_id: "pl-general-fallback",
        media_id: "asset-vid-promo",
        display_order: 2,
        duration_seconds: 15,
      },
    ],
  },
  {
    id: "pl-morning",
    name: "Especial Mañanas",
    description: "Contenido promocional matutino",
    is_fallback: false,
    items: [
      {
        id: "item-3",
        playlist_id: "pl-morning",
        media_id: "asset-img-breakfast",
        display_order: 1,
        duration_seconds: 10,
      },
      {
        id: "item-4",
        playlist_id: "pl-morning",
        media_id: "asset-vid-promo",
        display_order: 2,
        duration_seconds: 15,
      },
    ],
  },
];

const INITIAL_SCHEDULES: ScheduleRule[] = [
  {
    id: "sched-morning-weekdays",
    name: "Horario Mañana (Lun - Vie)",
    playlist_id: "pl-morning",
    days_of_week: [1, 2, 3, 4, 5],
    start_time: "07:00",
    end_time: "12:30",
    priority: 10,
    is_active: true,
  },
];

const INITIAL_DEVICES: TvDevice[] = [
  {
    id: "tv-main-lobby",
    device_code: "TV-8492",
    name: "Google TV Recepción Principal",
    location: "Planta Baja - Lobby",
    is_paired: true,
    installed_manifest_version: 1,
    free_storage_bytes: 6_450_000_000,
    is_online: true,
    last_seen_at: new Date().toISOString(),
  },
];

const INITIAL_MANIFEST = compileDeviceManifest({
  nextVersion: 1,
  assets: INITIAL_ASSETS,
  playlists: INITIAL_PLAYLISTS,
  schedules: INITIAL_SCHEDULES,
});

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<MediaAsset[]>(INITIAL_ASSETS);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [schedules, setSchedules] = useState<ScheduleRule[]>(INITIAL_SCHEDULES);
  const [devices, setDevices] = useState<TvDevice[]>(INITIAL_DEVICES);
  const [publishedManifest, setPublishedManifest] =
    useState<DeviceManifestPayload>(INITIAL_MANIFEST);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Cargar desde LocalStorage al iniciar en navegador
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.assets) setAssets(parsed.assets);
        if (parsed.playlists) setPlaylists(parsed.playlists);
        if (parsed.schedules) setSchedules(parsed.schedules);
        if (parsed.devices) setDevices(parsed.devices);
        if (parsed.publishedManifest) setPublishedManifest(parsed.publishedManifest);
      }
    } catch {
      // Ignorar si hay error de lectura en modo privado
    }
  }, []);

  // Guardar estado en LocalStorage ante cada cambio
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          assets,
          playlists,
          schedules,
          devices,
          publishedManifest,
        })
      );
    } catch {
      // Ignorar errores de cuota
    }
  }, [assets, playlists, schedules, devices, publishedManifest]);

  const uploadMediaFile = async (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const sha256 = await computeFileSha256(file);
    const durationSec = await extractMediaDurationSeconds(file);
    const storagePath = `media/${sha256}-${file.name}`;
    let publicUrl = URL.createObjectURL(file);

    if (isSupabaseConfigured && supabase) {
      const { error: uploadErr } = await supabase.storage
        .from("tv-media")
        .upload(storagePath, file, { upsert: true });

      if (!uploadErr) {
        const { data } = supabase.storage.from("tv-media").getPublicUrl(storagePath);
        publicUrl = data.publicUrl;
      }
    }

    const newAsset: MediaAsset = {
      id: `asset-${Date.now()}`,
      name: file.name,
      type: isVideo ? "VIDEO" : "IMAGE",
      mime_type: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
      storage_path: storagePath,
      public_url: publicUrl,
      sha256_hash: sha256,
      size_bytes: file.size,
      duration_seconds: durationSec,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from("media_assets").insert(newAsset);
    }

    setAssets((prev) => [newAsset, ...prev]);
    setHasUnpublishedChanges(true);
  };

  const deleteMediaAsset = async (assetId: string) => {
    const target = assets.find((a) => a.id === assetId);
    if (target && isSupabaseConfigured && supabase) {
      await supabase.storage.from("tv-media").remove([target.storage_path]);
      await supabase.from("media_assets").delete().eq("id", assetId);
    }

    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    // Limpiar también de cualquier playlist donde estuviera incluido
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        items: pl.items
          .filter((i) => i.media_id !== assetId)
          .map((item, idx) => ({ ...item, display_order: idx + 1 })),
      }))
    );
    setHasUnpublishedChanges(true);
  };

  const createPlaylist = (name: string, description: string, isFallback: boolean) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description,
      is_fallback: isFallback,
      items: [],
    };
    setPlaylists((prev) => {
      const updated = isFallback
        ? prev.map((p) => ({ ...p, is_fallback: false }))
        : prev;
      return [...updated, newPl];
    });
    setHasUnpublishedChanges(true);
  };

  const deletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    setSchedules((prev) => prev.filter((s) => s.playlist_id !== playlistId));
    setHasUnpublishedChanges(true);
  };

  const setFallbackPlaylist = (playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => ({
        ...p,
        is_fallback: p.id === playlistId,
      }))
    );
    setHasUnpublishedChanges(true);
  };

  const addAssetToPlaylist = (
    playlistId: string,
    assetId: string,
    durationSec?: number
  ) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const nextOrder = pl.items.length + 1;
        return {
          ...pl,
          items: [
            ...pl.items,
            {
              id: `pli-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              playlist_id: playlistId,
              media_id: assetId,
              display_order: nextOrder,
              duration_seconds: durationSec ?? asset.duration_seconds,
            },
          ],
        };
      })
    );
    setHasUnpublishedChanges(true);
  };

  const removeItemFromPlaylist = (playlistId: string, itemId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const filtered = pl.items
          .filter((i) => i.id !== itemId)
          .map((item, idx) => ({ ...item, display_order: idx + 1 }));
        return { ...pl, items: filtered };
      })
    );
    setHasUnpublishedChanges(true);
  };

  const updatePlaylistItemDuration = (
    playlistId: string,
    itemId: string,
    durationSec: number
  ) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        return {
          ...pl,
          items: pl.items.map((item) =>
            item.id === itemId
              ? { ...item, duration_seconds: Math.max(1, durationSec) }
              : item
          ),
        };
      })
    );
    setHasUnpublishedChanges(true);
  };

  const movePlaylistItem = (
    playlistId: string,
    itemId: string,
    direction: "UP" | "DOWN"
  ) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const idx = pl.items.findIndex((i) => i.id === itemId);
        if (idx === -1) return pl;
        const targetIdx = direction === "UP" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= pl.items.length) return pl;

        const copy = [...pl.items];
        const [moved] = copy.splice(idx, 1);
        copy.splice(targetIdx, 0, moved);

        return {
          ...pl,
          items: copy.map((item, i) => ({ ...item, display_order: i + 1 })),
        };
      })
    );
    setHasUnpublishedChanges(true);
  };

  const createSchedule = (rule: Omit<ScheduleRule, "id">) => {
    const newRule: ScheduleRule = {
      ...rule,
      id: `sched-${Date.now()}`,
    };
    setSchedules((prev) => [...prev, newRule]);
    setHasUnpublishedChanges(true);
  };

  const toggleScheduleActive = (scheduleId: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, is_active: !s.is_active } : s))
    );
    setHasUnpublishedChanges(true);
  };

  const deleteSchedule = (scheduleId: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    setHasUnpublishedChanges(true);
  };

  const pairDeviceByCode = (deviceCode: string, name: string, location: string) => {
    const cleanCode = deviceCode.trim().toUpperCase();
    if (!cleanCode) return;

    const newDevice: TvDevice = {
      id: `tv-${Date.now()}`,
      device_code: cleanCode,
      name: name.trim() || `Google TV (${cleanCode})`,
      location: location.trim() || "Ubicación Principal",
      is_paired: true,
      installed_manifest_version: publishedManifest.version,
      free_storage_bytes: 8_120_000_000,
      is_online: true,
      last_seen_at: new Date().toISOString(),
    };

    setDevices((prev) => [...prev, newDevice]);
  };

  const simulateDeviceOfflineToggle = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              is_online: !d.is_online,
              // Al reconectarse a internet, la TV descarga automáticamente el último manifiesto publicado
              installed_manifest_version: !d.is_online
                ? publishedManifest.version
                : d.installed_manifest_version,
              last_seen_at: !d.is_online ? new Date().toISOString() : d.last_seen_at,
            }
          : d
      )
    );
  };

  const publishToTvs = async (): Promise<DeviceManifestPayload> => {
    setIsPublishing(true);
    try {
      const nextVersion = publishedManifest.version + 1;
      const compiled = compileDeviceManifest({
        nextVersion,
        assets,
        playlists,
        schedules,
      });

      if (isSupabaseConfigured && supabase) {
        await supabase.from("device_manifests").insert({
          version: compiled.version,
          payload_json: compiled,
        });
      }

      setPublishedManifest(compiled);
      setHasUnpublishedChanges(false);

      // Las TVs que estén Online en ese momento reciben el push de Supabase Realtime y sincronizan a la nueva versión;
      // Las TVs que estén Offline mantienen su versión local hasta que recobren el internet.
      setDevices((prev) =>
        prev.map((d) =>
          d.is_online
            ? {
                ...d,
                installed_manifest_version: compiled.version,
                last_seen_at: new Date().toISOString(),
              }
            : d
        )
      );

      return compiled;
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        assets,
        playlists,
        schedules,
        devices,
        publishedManifest,
        hasUnpublishedChanges,
        isPublishing,
        isCloudConnected: isSupabaseConfigured,
        uploadMediaFile,
        deleteMediaAsset,
        createPlaylist,
        deletePlaylist,
        setFallbackPlaylist,
        addAssetToPlaylist,
        removeItemFromPlaylist,
        updatePlaylistItemDuration,
        movePlaylistItem,
        createSchedule,
        toggleScheduleActive,
        deleteSchedule,
        pairDeviceByCode,
        simulateDeviceOfflineToggle,
        publishToTvs,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard debe usarse dentro de un DashboardProvider");
  }
  return ctx;
}
