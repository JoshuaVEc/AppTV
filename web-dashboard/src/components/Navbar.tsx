"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Tv,
  Film,
  CalendarClock,
  LayoutDashboard,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Radio,
} from "lucide-react";
import { useDashboard } from "@/lib/DashboardContext";

export function Navbar() {
  const pathname = usePathname();
  const {
    publishedManifest,
    hasUnpublishedChanges,
    isPublishing,
    publishToTvs,
    devices,
  } = useDashboard();

  const onlineCount = devices.filter((d) => d.is_online).length;

  const navItems = [
    { href: "/", label: "Resumen & Simulador TV", icon: LayoutDashboard },
    { href: "/media", label: "Archivos Multimedia", icon: Film },
    { href: "/schedules", label: "Playlists y Horarios", icon: CalendarClock },
    { href: "/devices", label: "Televisores (Google TV)", icon: Tv },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Tv className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                AppTV Studio
              </span>
              <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/30">
                Google TV OS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Control Remoto Cloud • Sincronización Offline-First
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-xs">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              Manifiesto v{publishedManifest.version} ({onlineCount}/{devices.length} TVs online)
            </span>
            {hasUnpublishedChanges ? (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="h-3 w-3" /> Cambios pendientes de envío
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Sincronizado con la nube
              </span>
            )}
          </div>

          <button
            onClick={() => publishToTvs()}
            disabled={isPublishing}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition shadow-lg ${
              hasUnpublishedChanges
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/25 animate-pulse"
                : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20"
            }`}
          >
            <CloudUpload className="h-4 w-4" />
            {isPublishing
              ? "Publicando..."
              : hasUnpublishedChanges
              ? "Publicar Cambios a TV"
              : "Re-Publicar Manifiesto"}
          </button>
        </div>
      </div>
    </header>
  );
}
