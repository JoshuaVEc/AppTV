"use client";

import React, { useState } from "react";
import {
  Tv,
  Plus,
  Wifi,
  WifiOff,
  HardDrive,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useDashboard } from "@/lib/DashboardContext";
import { formatBytes } from "@/lib/hashUtils";

export default function DevicesPage() {
  const {
    devices,
    publishedManifest,
    pairDeviceByCode,
    simulateDeviceOfflineToggle,
  } = useDashboard();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const handlePair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    pairDeviceByCode(code, name, location);
    setCode("");
    setName("");
    setLocation("");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Televisores Google TV Vinculados
        </h1>
        <p className="text-sm text-slate-400">
          Vincula un nuevo televisor ingresando el código de 6 caracteres que aparece en la app nativa de Google TV y monitorea su estado de caché local.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Formulario de vinculación por código */}
        <div className="lg:col-span-4">
          <form
            onSubmit={handlePair}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Tv className="h-5 w-5 text-indigo-400" />
              Vincular Nueva Google TV
            </h2>
            <p className="text-xs text-slate-400">
              Abre la app <strong>AppTV Signage</strong> en tu televisor Google TV e ingresa el código mostrado en pantalla.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Código en Pantalla de la TV
              </label>
              <input
                type="text"
                required
                placeholder="Ej. TV-4910"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-mono uppercase tracking-wider text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nombre del Televisor
              </label>
              <input
                type="text"
                placeholder="Ej. TV Comedor / Sala de Espera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Ubicación / Sucursal
              </label>
              <input
                type="text"
                placeholder="Ej. Piso 2 - Recepción"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
            >
              <Plus className="h-4 w-4" /> Vincular y Sincronizar Ahora
            </button>
          </form>
        </div>

        {/* Lista de televisores */}
        <div className="lg:col-span-8 space-y-4">
          {devices.map((device) => {
            const isUpToDate =
              device.installed_manifest_version === publishedManifest.version;
            return (
              <div
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 font-mono text-xs font-bold text-indigo-300 border border-indigo-500/30">
                      {device.device_code}
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {device.name}
                    </h3>
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        device.is_online
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {device.is_online ? (
                        <>
                          <Wifi className="h-3 w-3" /> Conectada a Internet
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3 w-3" /> Sin Internet (Modo Offline Activo)
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Ubicación: <strong className="text-slate-200">{device.location}</strong>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5 text-indigo-400" />
                      Espacio Libre en TV:{" "}
                      <strong>{formatBytes(device.free_storage_bytes)}</strong>
                    </span>

                    <span className="flex items-center gap-1.5">
                      {isUpToDate ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          Manifiesto en memoria local:{" "}
                          <strong className="text-emerald-300">
                            v{device.installed_manifest_version} (Al día)
                          </strong>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                          Manifiesto en memoria local:{" "}
                          <strong className="text-amber-300">
                            v{device.installed_manifest_version} (Pendiente v{publishedManifest.version} al reconectar)
                          </strong>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => simulateDeviceOfflineToggle(device.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold border transition ${
                      device.is_online
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    }`}
                  >
                    {device.is_online
                      ? "Simular Desconexión de TV"
                      : "Simular Reconexión Wi-Fi"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
