# AppTV: Sistema de Cartelería Digital para Google TV (Offline-First)

Ecosistema completo de **Digital Signage** diseñado para controlar televisores con **Google TV (Android TV OS)** desde un computador a través de internet, garantizando que **si el computador se apaga y el televisor pierde la conexión a internet (o sufre un corte de energía), la TV continúe reproduciendo la última modificación y respetando los horarios programados**.

## Estructura del Proyecto

- [`supabase/`](./supabase): Esquema de base de datos PostgreSQL, configuración del bucket `tv-media` en Supabase Storage y canales `supabase_realtime`.
- [`web-dashboard/`](./web-dashboard): Aplicación Web para el computador (Next.js + TypeScript + Tailwind CSS) con gestor de imágenes/videos (firma SHA-256), constructor de Playlists, programador de horarios semanales, gestión de televisores por código y simulador en vivo de Google TV.
- [`google-tv-app/`](./google-tv-app): Aplicación nativa para Google TV escrita en **Kotlin + Jetpack Compose for TV + Media3 (ExoPlayer) + Room Database**, con motor de descarga atómica (`ManifestSyncManager`), recolector de basura en disco y auto-arranque tras apagones (`BootCompletedReceiver`).

## Cómo Ejecutar el Dashboard Web

```bash
cd web-dashboard
npm install
npm run test
npm run dev
```

Opcionalmente, para conectar con tu proyecto de Supabase en la nube, crea un archivo `web-dashboard/.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

## Cómo Compilar la App de Google TV

1. Abre la carpeta `google-tv-app/` en **Android Studio** (Ladybug o superior).
2. Conecta tu Google TV mediante ADB (`adb connect <IP_DE_TU_TV>:5555`) o usa un emulador de **Google TV (API 34)**.
3. Ejecuta el módulo `app` o genera el instalador con `./gradlew assembleDebug`.
