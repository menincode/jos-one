export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
    return "—";
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/** Export column: show centiseconds for short clips (from FFmpeg render log). */
export function formatExportDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return "—";
  }
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  return formatDuration(seconds);
}

/** FFmpeg render speed from log (``speed=4.41x``). */
export function formatExportSpeed(speedX: number | null | undefined): string {
  if (speedX == null || !Number.isFinite(speedX) || speedX <= 0) {
    return "—";
  }
  return `${speedX.toFixed(2)}x`;
}
