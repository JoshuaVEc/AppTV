-- =============================================================================
-- AppTV: Sistema de Cartelería Digital para Google TV (Offline-First)
-- Esquema PostgreSQL + Supabase Storage + Realtime
-- =============================================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Archivos Multimedia (Imágenes y Videos)
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('IMAGE', 'VIDEO')),
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 10,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_sha256 ON public.media_assets(sha256_hash);

-- 2. Tabla de Listas de Reproducción (Playlists)
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantizar que solo exista una playlist fallback activa a la vez (índice parcial)
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_fallback_playlist
    ON public.playlists (is_fallback)
    WHERE is_fallback = TRUE;

-- 3. Ítems dentro de cada Playlist (Orden y duración en pantalla)
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlist_items_order ON public.playlist_items(playlist_id, display_order);

-- 4. Horarios Programados (Schedules)
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    days_of_week INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=Domingo, 1=Lunes ... 6=Sábado
    start_time TEXT NOT NULL, -- Formato HH:mm (ej. "08:00")
    end_time TEXT NOT NULL,   -- Formato HH:mm (ej. "18:00")
    start_date DATE,          -- Opcional: vigencia desde fecha
    end_date DATE,            -- Opcional: vigencia hasta fecha
    priority INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Dispositivos Google TV vinculados
CREATE TABLE IF NOT EXISTS public.tv_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_code TEXT NOT NULL UNIQUE, -- Ej: "TV-8492"
    name TEXT NOT NULL DEFAULT 'Google TV Sin Nombre',
    location TEXT,
    is_paired BOOLEAN NOT NULL DEFAULT FALSE,
    installed_manifest_version INTEGER NOT NULL DEFAULT 0,
    free_storage_bytes BIGINT,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Manifiestos Inmutables Publicados (Fuente de Verdad para Sincronización Atómica)
CREATE TABLE IF NOT EXISTS public.device_manifests (
    version SERIAL PRIMARY KEY,
    payload_json JSONB NOT NULL,
    notes TEXT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Configuración de Supabase Storage y Realtime
-- =============================================================================

-- Crear bucket público 'tv-media' para almacenar imágenes y videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tv-media', 'tv-media', true)
ON CONFLICT (id) DO NOTHING;

-- Habilitar notificaciones en tiempo real para que Google TV reciba cambios al instante
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_manifests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_devices;
