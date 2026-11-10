import type { Metadata } from "next";
import "./globals.css";
import { DashboardProvider } from "@/lib/DashboardContext";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AppTV Studio | Control Remoto Google TV (Offline-First)",
  description:
    "Panel de administración de Cartelería Digital para Google TV con sincronización en la nube y reproducción autónoma sin conexión",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <DashboardProvider>
          <Navbar />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </DashboardProvider>
      </body>
    </html>
  );
}
