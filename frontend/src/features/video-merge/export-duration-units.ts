const SECONDS_PER_MINUTE = 60;

/** Default export duration targets (stored as seconds, shown as minutes in UI). */
export const DEFAULT_DURATION_MIN_SEC = String(60 * SECONDS_PER_MINUTE);
export const DEFAULT_DURATION_MAX_SEC = String(90 * SECONDS_PER_MINUTE);
export const DEFAULT_DURATION_MIN_MINUTES = "60";
export const DEFAULT_DURATION_MAX_MINUTES = "90";

function parseNumeric(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const value = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

/** Stored export settings use seconds; inputs show minutes. */
export function secondsToMinutesInputValue(secondsRaw: string): string {
  const sec = parseNumeric(secondsRaw);
  if (sec == null) {
    return secondsRaw.trim();
  }
  return formatNumber(sec / SECONDS_PER_MINUTE);
}

/** Convert minutes typed in the UI back to seconds for persistence and FFmpeg. */
export function minutesInputValueToSeconds(minutesRaw: string): string {
  const min = parseNumeric(minutesRaw);
  if (min == null) {
    return minutesRaw.trim();
  }
  return formatNumber(min * SECONDS_PER_MINUTE);
}
