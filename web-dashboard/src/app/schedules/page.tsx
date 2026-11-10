"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  CalendarClock,
  ArrowUp,
  ArrowDown,
  Star,
  Clock,
  ListVideo,
  Check,
} from "lucide-react";
import { useDashboard } from "@/lib/DashboardContext";

const DAYS = [
  { id: 1, short: "Lun", full: "Lunes" },
  { id: 2, short: "Mar", full: "Martes" },
  { id: 3, short: "Mié", full: "Miércoles" },
  { id: 4, short: "Jue", full: "Jueves" },
  { id: 5, short: "Vie", full: "Viernes" },
  { id: 6, short: "Sáb", full: "Sábado" },
  { id: 0, short: "Dom", full: "Domingo" },
];

export default function SchedulesAndPlaylistsPage() {
  const {
    assets,
    playlists,
    schedules,
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
  } = useDashboard();

  // Estado formulario nueva Playlist
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    playlists[0]?.id ?? ""
  );

  // Estado formulario nuevo Horario
  const [schedName, setSchedName] = useState("");
  const [schedPlaylistId, setSchedPlaylistId] = useState<string>(
    playlists[0]?.id ?? ""
  );
  const [schedDays, setSchedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [schedStart, setSchedStart] = useState("08:00");
  const [schedEnd, setSchedEnd] = useState("18:00");
  const [schedPriority, setSchedPriority] = useState(10);

  const activePlaylist =
    playlists.find((p) => p.id === selectedPlaylistId) ?? playlists[0] ?? null;

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim(), false);
    setNewPlaylistName("");
    setNewPlaylistDesc("");
  };

  const toggleDaySelection = (day: number) => {
    setSchedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedName.trim() || !schedPlaylistId || schedDays.length === 0) return;

    createSchedule({
      name: schedName.trim(),
      playlist_id: schedPlaylistId,
      days_of_week: schedDays,
      start_time: schedStart,
      end_time: schedEnd,
      priority: schedPriority,
      is_active: true,
    });

    setSchedName("");
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Programación de Horarios y Listas de Reproducción
        </h1>
        <p className="text-sm text-slate-400">
          Organiza tus imágenes y videos en Playlists y programa en qué días y rangos de horas deben aparecer en la Google TV.
        </p>
      </div>

      {/* SECCIÓN 1: Constructor de Playlists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Columna izquierda: Lista de Playlists + Crear Nueva */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ListVideo className="h-4 w-4 text-indigo-400" />
              1. Tus Playlists ({playlists.length})
            </h2>

            <div className="space-y-2">
              {playlists.map((pl) => {
                const isSelected = activePlaylist?.id === pl.id;
                return (
                  <div
                    key={pl.id}
                    onClick={() => setSelectedPlaylistId(pl.id)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-white">
                        {pl.name}
                      </span>
                      {pl.is_fallback && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                          <Star className="h-3 w-3" /> Por Defecto
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {pl.items.length} archivos en secuencia
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2">
                      {!pl.is_fallback ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFallbackPlaylist(pl.id);
                          }}
                          className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          Hacer lista por defecto
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Activa fuera de horario
                        </span>
                      )}

                      {playlists.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePlaylist(pl.id);
                          }}
                          className="text-xs text-rose-400 hover:text-rose-300"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleCreatePlaylist}
              className="border-t border-slate-800 pt-4 space-y-3"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Crear Nueva Playlist
              </h3>
              <input
                type="text"
                placeholder="Ej. Promociones Fin de Semana"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Descripción opcional"
                value={newPlaylistDesc}
                onChange={(e) => setNewPlaylistDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                <Plus className="h-4 w-4" /> Crear Playlist
              </button>
            </form>
          </div>
        </div>

        {/* Columna derecha: Editor de Secuencia de la Playlist Seleccionada */}
        <div className="lg:col-span-8 space-y-4">
          {activePlaylist ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Contenido de: {activePlaylist.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define el orden exacto y cuántos segundos se muestra cada imagen o video en la Google TV.
                  </p>
                </div>
              </div>

              {/* Lista de ítems actuales en la playlist */}
              <div className="space-y-2.5">
                {activePlaylist.items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
                    Esta playlist aún no tiene archivos. Haz clic en los archivos de abajo para añadirlos.
                  </div>
                ) : (
                  activePlaylist.items.map((item, idx) => {
                    const asset = assets.find((a) => a.id === item.media_id);
                    if (!asset) return null;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-indigo-300">
                            {idx + 1}
                          </span>
                          <div className="h-10 w-16 overflow-hidden rounded-lg bg-black border border-slate-800">
                            {asset.type === "VIDEO" ? (
                              <video
                                src={asset.public_url}
                                className="h-full w-full object-cover"
                                muted
                              />
                            ) : (
                              <img
                                src={asset.public_url}
                                alt={asset.name}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {asset.name}
                            </p>
                            <span className="text-[11px] text-slate-400">
                              Tipo: {asset.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="number"
                              min={1}
                              max={3600}
                              value={item.duration_seconds}
                              onChange={(e) =>
                                updatePlaylistItemDuration(
                                  activePlaylist.id,
                                  item.id,
                                  Number(e.target.value)
                                )
                              }
                              className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-center text-xs text-white"
                            />
                            <span className="text-slate-400">seg</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                movePlaylistItem(activePlaylist.id, item.id, "UP")
                              }
                              className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                              title="Subir orden"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                movePlaylistItem(activePlaylist.id, item.id, "DOWN")
                              }
                              className="rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                              title="Bajar orden"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                removeItemFromPlaylist(activePlaylist.id, item.id)
                              }
                              className="rounded-lg bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500/20"
                              title="Quitar de la lista"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selector rápido para añadir archivos de la Biblioteca a esta Playlist */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Añadir Archivo Multimedia a &ldquo;{activePlaylist.name}&rdquo;
                </h4>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => addAssetToPlaylist(activePlaylist.id, asset.id)}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-left text-xs hover:border-indigo-500/50 hover:bg-indigo-500/5 transition"
                    >
                      <span className="truncate font-medium text-slate-200">
                        {asset.name}
                      </span>
                      <span className="ml-2 shrink-0 rounded-md bg-indigo-600/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                        + Añadir ({asset.duration_seconds}s)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* SECCIÓN 2: Programador de Horarios (Schedules) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 border-t border-slate-800 pt-8">
        {/* Crear nuevo horario */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleCreateSchedule}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-emerald-400" />
              2. Programar Nuevo Bloque Horario
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre del Horario
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Promoción Almuerzo (Mediodía)"
                value={schedName}
                onChange={(e) => setSchedName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Playlist que se reproducirá en la TV
              </label>
              <select
                value={schedPlaylistId}
                onChange={(e) => setSchedPlaylistId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                {playlists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name} ({pl.items.length} archivos)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Días de la Semana
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d) => {
                  const active = schedDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDaySelection(d.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Hora Inicio
                </label>
                <input
                  type="time"
                  value={schedStart}
                  onChange={(e) => setSchedStart(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Hora Fin
                </label>
                <input
                  type="time"
                  value={schedEnd}
                  onChange={(e) => setSchedEnd(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Prioridad (Mayor número gana si hay horarios solapados)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={schedPriority}
                onChange={(e) => setSchedPriority(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20"
            >
              <Plus className="h-4 w-4" /> Guardar Regla de Horario
            </button>
          </form>
        </div>

        {/* Lista de Horarios Configurados */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              Reglas de Horario Programadas ({schedules.length})
            </h3>
            <p className="text-xs text-slate-400">
              La Google TV evalúa estas reglas segundo a segundo usando su reloj interno, sin depender de internet una vez descargado el manifiesto.
            </p>

            <div className="space-y-3">
              {schedules.map((sched) => {
                const pl = playlists.find((p) => p.id === sched.playlist_id);
                const dayLabels = DAYS.filter((d) =>
                  sched.days_of_week.includes(d.id)
                )
                  .map((d) => d.short)
                  .join(", ");

                return (
                  <div
                    key={sched.id}
                    className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition ${
                      sched.is_active
                        ? "border-slate-800 bg-slate-950"
                        : "border-slate-800/50 bg-slate-950/40 opacity-60"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {sched.name}
                        </span>
                        <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                          Prioridad {sched.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Playlist:{" "}
                        <strong className="text-emerald-300">
                          {pl?.name ?? "Eliminada"}
                        </strong>
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        🕒 {sched.start_time} a {sched.end_time} • 📅 {dayLabels}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleScheduleActive(sched.id)}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          sched.is_active
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {sched.is_active ? "Activo" : "Pausado"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteSchedule(sched.id)}
                        className="rounded-lg bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20"
                        title="Eliminar horario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
