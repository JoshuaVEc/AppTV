export type MediaType = "IMAGE" | "VIDEO";

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  mime_type: string;
  storage_path: string;
  public_url: string;
  sha256_hash: string;
  size_bytes: number;
  duration_seconds: number;
  created_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_id: string;
  display_order: number;
  duration_seconds: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  is_fallback: boolean;
  items: PlaylistItem[];
}

export interface ScheduleRule {
  id: string;
  name: string;
  playlist_id: string;
  days_of_week: number[]; // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
  start_time: string;     // "HH:mm"
  end_time: string;       // "HH:mm"
  priority: number;
  is_active: boolean;
}

export interface TvDevice {
  id: string;
  device_code: string;
  name: string;
  location: string;
  is_paired: boolean;
  installed_manifest_version: number;
  free_storage_bytes: number;
  is_online: boolean;
  last_seen_at: string;
}

/**
 * Payload inmutable que se envía a la Google TV para sincronización atómica y modo Offline-First.
 */
export interface DeviceManifestPayload {
  version: number;
  generated_at: string;
  fallback_playlist_id: string | null;
  assets: Array<{
    id: string;
    name: string;
    type: MediaType;
    url: string;
    sha256: string;
    size_bytes: number;
  }>;
  playlists: Record<
    string,
    Array<{
      asset_id: string;
      order: number;
      duration_sec: number;
    }>
  >;
  schedules: Array<{
    id: string;
    name: string;
    playlist_id: string;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    priority: number;
  }>;
}
