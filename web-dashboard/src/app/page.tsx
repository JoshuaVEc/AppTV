"use client";

import React, { useEffect, useState } from "react";
import {
  Tv,
  Wifi,
  WifiOff,
  HardDrive,
  Clock,
  Film,
  CalendarClock,
  CheckCircle2,
  ShieldCheck,
  Play,
  SkipForward,
  Code2,
} from "lucide-react";
import { useDashboard } from "@/lib/DashboardContext";
import { evaluateActivePlaylist } from "@/lib/manifestCompiler";
import { formatBytes } from "@/lib/hashUtils";

const DAYS_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export default function OverviewAndSimulatorPage() {
  const {
    assets,
    playlists,
    schedules,
    devices,
    publishedManifest,
    simulateDeviceOfflineToggle,
  } = useDashboard();

  // Reloj simulado para probar cómo se comporta la Google TV en distintas horas/días
  const [simulatedDay, setSimulatedDay] = useState<number>(1); // Lunes
  const [simulatedTime, setSimulatedTime] = useState<string>("09:00");
  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const [showManifestModal, setShowManifestModal] = useState<boolean>(false);

  const primaryTv = devices[0];

  const evaluation = evaluateActivePlaylist(
    publishedManifest,
    simulatedDay,
    simulatedTime
  );

  const activePlaylistItems = evaluation.activePlaylistId
    ? publishedManifest.playlists[evaluation.activePlaylistId] ?? []
    : [];

  const currentItem =
    activePlaylistItems.length > 0
      ? activePlaylistItems[currentSlideIdx % activePlaylistItems.length]
      : null;

  const currentAsset = currentItem
    ? publishedManifest.assets.find((a) => a.id === currentItem.asset_id) ?? null
    : null;

  // Avance automático del carrusel según la duración configurada de cada ítem
  useEffect(() => {
    if (activePlaylistItems.length <= 1) return;
    const durationMs = (currentItem?.duration_sec ?? 8) * 1000;
    const timer = setTimeout(() => {
      setCurrentSlideIdx((prev) => (prev + 1) % activePlaylistItems.length);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [activePlaylistItems.length, currentItem, currentSlideIdx]);

  const totalCachedBytes = publishedManifest.assets.reduce(
    (acc, a) => acc + a.size_bytes,
    0
  );

  return (
    <div className="space-y-8">
      {/* Tarjetas de métricas rápidas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Archivos Multimedia
            </span>
            <Film className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{assets.length}</p>
          <p className="mt-1 text-xs text-slate-400">
            {publishedManifest.assets.length} en caché local de la TV ({formatBytes(totalCachedBytes)})
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Horarios Activos
            </span>
            <CalendarClock className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {schedules.filter((s) => s.is_active).length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {playlists.length} Playlists configuradas
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Versión en Nube
            </span>
            <ShieldCheck className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            Manifiesto v{publishedManifest.version}
          </p>
          <button
            onClick={() => setShowManifestModal(true)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            <Code2 className="h-3.5 w-3.5" /> Ver JSON enviado a la TV
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Estado Google TV
            </span>
            <Tv className="h-5 w-5 text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {primaryTv?.is_online ? "Online (Sincronizada)" : "Offline (Autónoma)"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Ejecutando Manifiesto local v{primaryTv?.installed_manifest_version ?? 1}
          </p>
        </div>
      </div>

      {/* Simulador Interactivo de la Google TV y Prueba de Desconexión */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Pantalla de la Google TV */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Vista Previa en Vivo: Cliente Google TV
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/30">
                  Motor Offline-First Activo
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Simula exactamente cómo la app nativa Android TV evalúa el manifiesto guardado en su almacenamiento interno.
              </p>
            </div>

            {primaryTv && (
              <button
                onClick={() => simulateDeviceOfflineToggle(primaryTv.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border transition ${
                  primaryTv.is_online
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                }`}
              >
                {primaryTv.is_online ? (
                  <>
                    <WifiOff className="h-4 w-4" /> Simular Corte de Internet / PC Apagado
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4" /> Reconectar Google TV a Internet
                  </>
                )}
              </button>
            )}
          </div>

          {/* Marco de televisor 16:9 */}
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-4 border-slate-800 bg-black shadow-2xl">
            {currentAsset ? (
              currentAsset.type === "VIDEO" ? (
                <video
                  key={currentAsset.id}
                  src={currentAsset.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  key={currentAsset.id}
                  src={currentAsset.url}
                  alt={currentAsset.name}
                  className="h-full w-full object-cover transition-opacity duration-500"
                />
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-500">
                <Tv className="h-12 w-12 mb-3 text-slate-600" />
                <p className="text-sm font-medium text-slate-300">
                  Sin contenido programado para este bloque horario
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Asigna una Playlist por Defecto (Fallback) o crea un horario para {DAYS_NAMES[simulatedDay]} a las {simulatedTime}.
                </p>
              </div>
            )}

            {/* HUD Superior de la Google TV (Idéntico al HUD en Jetpack Compose) */}
            <div className="absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-950/80 px-4 py-2.5 text-xs backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-3">
                <span
                  className={`flex items-center gap-1.5 font-semibold ${
                    primaryTv?.is_online ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {primaryTv?.is_online ? (
                    <>
                      <Wifi className="h-3.5 w-3.5" /> ONLINE (Cloud Sync)
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3.5 w-3.5" /> OFFLINE (Reproduciendo desde Disco Local)
                    </>
                  )}
                </span>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <HardDrive className="h-3.5 w-3.5 text-indigo-400" />
                  Caché Local: Manifiesto v{primaryTv?.installed_manifest_version ?? publishedManifest.version}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-200 font-mono">
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
                <span>
                  {DAYS_NAMES[simulatedDay]} {simulatedTime}
                </span>
              </div>
            </div>

            {/* HUD Inferior de información de reproducción */}
            {currentAsset && (
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-xl bg-slate-950/85 px-4 py-3 text-xs backdrop-blur-md border border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                      {currentAsset.type}
                    </span>
                    <span className="font-semibold text-white">
                      {currentAsset.name}
                    </span>
                    <span className="text-slate-400">
                      ({currentSlideIdx + 1}/{activePlaylistItems.length})
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Ruta en TV:{" "}
                    <code className="text-emerald-300">
                      /data/user/0/com.apptv.player/files/media/{currentAsset.sha256.slice(0, 12)}.
                      {currentAsset.type === "VIDEO" ? "mp4" : "jpg"}
                    </code>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">
                    Duración: <strong className="text-white">{currentItem?.duration_sec}s</strong>
                  </span>
                  <button
                    onClick={() =>
                      setCurrentSlideIdx(
                        (prev) => (prev + 1) % Math.max(1, activePlaylistItems.length)
                      )
                    }
                    className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                    title="Saltar al siguiente ítem"
                  >
                    <SkipForward className="h-3.5 w-3.5" /> Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel de Control del Reloj Simulado y Diagnóstico Offline */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                Probador de Horarios de la TV
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Cambia el día y la hora para verificar qué Playlist seleccionará automáticamente el reloj interno del televisor (incluso sin internet).
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Día de la Semana en el Televisor
                </label>
                <select
                  value={simulatedDay}
                  onChange={(e) => {
                    setSimulatedDay(Number(e.target.value));
                    setCurrentSlideIdx(0);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {DAYS_NAMES.map((day, idx) => (
                    <option key={day} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Hora del Reloj Interno de la TV (HH:mm)
                </label>
                <input
                  type="time"
                  value={simulatedTime}
                  onChange={(e) => {
                    setSimulatedTime(e.target.value);
                    setCurrentSlideIdx(0);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Regla Aplicada:</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    evaluation.isFallback
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  {evaluation.isFallback
                    ? "Fallback (Por Defecto)"
                    : evaluation.matchedScheduleName}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Playlist Activa:</span>
                <span className="font-semibold text-white">
                  {playlists.find((p) => p.id === evaluation.activePlaylistId)?.name ??
                    "Ninguna"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Archivos en rotación:</span>
                <span className="font-semibold text-indigo-300">
                  {activePlaylistItems.length} ítems
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-slate-300 space-y-1.5">
              <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                ¿Qué pasa si se apaga la PC y el Wi-Fi?
              </p>
              <p className="text-slate-400 leading-relaxed">
                La Google TV guarda el <strong>Manifiesto v{publishedManifest.version}</strong> en su base de datos <code>Room</code> y todos los videos/imágenes en <code>/files/media/</code> verificados con <strong>SHA-256</strong>. Al reiniciarse sin red, el <code>BootCompletedReceiver</code> abre la app y continúa reproduciendo exactamente la última modificación.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para inspeccionar el JSON real del Manifiesto Inmutable */}
      {showManifestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Manifiesto Inmutable Sincronizado (v{publishedManifest.version})
                </h3>
                <p className="text-xs text-slate-400">
                  Este JSON se almacena en Supabase y en la base de datos Room local de cada Google TV.
                </p>
              </div>
              <button
                onClick={() => setShowManifestModal(false)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
            <div className="overflow-auto p-6">
              <pre className="rounded-xl bg-slate-950 p-4 text-xs text-emerald-300 font-mono overflow-x-auto border border-slate-800">
                {JSON.stringify(publishedManifest, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
