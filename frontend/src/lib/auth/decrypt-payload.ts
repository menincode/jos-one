/** Reverse of Google Apps Script `encryptDataPayload` in `google_apps_script/route.js`. */
export function decryptAuthPayload(encoded: string): string {
  const trimmed = encoded.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const decoded = atob(trimmed);
    return decoded
      .split("-")
      .filter(Boolean)
      .map((part) => String.fromCharCode(Number.parseInt(part, 16)))
      .join("");
  } catch {
    return trimmed;
  }
}

export function parseEncryptedAuthPayload(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const plain = decryptAuthPayload(value);
    const parsed: unknown = JSON.parse(plain);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}
