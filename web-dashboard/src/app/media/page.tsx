"use client";

import React, { useRef, useState } from "react";
import {
  Upload,
  Trash2,
  Film,
  Image as ImageIcon,
  ShieldCheck,
  Clock,
  HardDrive,
} from "lucide-react";
import { useDashboard } from "@/lib/DashboardContext";
import { formatBytes } from "@/lib/hashUtils";

export default function MediaLibraryPage() {
  const { assets, playlists, uploadMediaFile, deleteMediaAsset } = useDashboard();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadMediaFile(file);
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getPlaylistsUsingAsset = (assetId: string): string[] => {
    return playlists
      .filter((pl) => pl.items.some((item) => item.media_id === assetId))
      .map((pl) => pl.name);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Biblioteca de Archivos Multimedia
          </h1>
          <p className="text-sm text-slate-400">
            Añade o elimina imágenes (JPG, PNG, WebP) y videos (MP4, WebM). Cada archivo se firma con SHA-256 para descarga segura en la Google TV.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Calculando SHA-256 y Subiendo..." : "Subir Imagen o Video"}
          </button>
        </div>
      </div>

      {/* Zona Drag and Drop */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFilesSelected(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/40 p-8 text-center transition hover:border-indigo-500/60 hover:bg-slate-900/80"
      >
        <Upload className="mx-auto h-9 w-9 text-indigo-400" />
        <p className="mt-3 text-sm font-medium text-slate-200">
          Arrastra tus imágenes o videos aquí o haz clic para explorar en tu computador
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Al eliminar un archivo y publicar el manifiesto, el recolector de basura de la Google TV lo borrará automáticamente de la memoria del televisor.
        </p>
      </div>

      {/* Cuadrícula de archivos */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => {
          const usedIn = getPlaylistsUsingAsset(asset.id);
          return (
            <div
              key={asset.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg transition hover:border-slate-700"
            >
              <div className="relative aspect-video w-full bg-black overflow-hidden">
                {asset.type === "VIDEO" ? (
                  <video
                    src={asset.public_url}
                    muted
                    loop
                    playsInline
                    onMouseOver={(e) => e.currentTarget.play()}
                    onMouseOut={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={asset.public_url}
                    alt={asset.name}
                    className="h-full w-full object-cover"
                  />
                )}

                <span
                  className={`absolute left-3 top-3 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold backdrop-blur-md ${
                    asset.type === "VIDEO"
                      ? "bg-amber-500/80 text-slate-950"
                      : "bg-indigo-600/85 text-white"
                  }`}
                >
                  {asset.type === "VIDEO" ? (
                    <Film className="h-3.5 w-3.5" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5" />
                  )}
                  {asset.type}
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-between p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="truncate font-semibold text-white" title={asset.name}>
                    {asset.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3.5 w-3.5 text-slate-500" />
                      {formatBytes(asset.size_bytes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {asset.duration_seconds}s por defecto
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-mono text-slate-400 border border-slate-800"
                    title={`SHA-256: ${asset.sha256_hash}`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span className="truncate">
                      SHA256: {asset.sha256_hash.slice(0, 20)}...
                    </span>
                  </div>

                  {usedIn.length > 0 ? (
                    <div className="text-xs text-indigo-300">
                      En uso en:{" "}
                      <span className="font-medium">{usedIn.join(", ")}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      Sin asignar a ninguna Playlist todavía
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end border-t border-slate-800 pt-3">
                  <button
                    onClick={() => deleteMediaAsset(asset.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar Archivo
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
