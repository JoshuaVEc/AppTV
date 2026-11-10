/**
 * Calcula el hash SHA-256 en formato hexadecimal para un archivo en el navegador
 * usando la Web Crypto API nativa. Esto permite verificar en la Google TV que
 * el archivo descargado está íntegro al 100% antes de reproducirlo en modo offline.
 */
export async function computeFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extrae automáticamente la duración en segundos si el archivo es un VIDEO,
 * o devuelve 10 segundos por defecto si es una IMAGEN.
 */
export function extractMediaDurationSeconds(file: File): Promise<number> {
  if (!file.type.startsWith("video/")) {
    return Promise.resolve(10);
  }

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const duration = Math.round(video.duration);
      resolve(Number.isFinite(duration) && duration > 0 ? duration : 15);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(15);
    };

    video.src = objectUrl;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
