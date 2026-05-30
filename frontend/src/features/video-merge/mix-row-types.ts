export const MAX_LEADING_VIDEOS_PER_ROW = 5;
export const MIN_LEADING_VIDEOS_PER_ROW = 1;

export type MixRow = {
  id: string;
  leadingPaths: string[];
  /** YouTube-style chapter timestamps (all clips in mix), persisted after successful merge. */
  chaptime?: string;
};

export type MixRowPayload = {
  id: string;
  leading_paths: string[];
  chaptime?: string;
};

export function createEmptyMixRow(): MixRow {
  return {
    id: newMixRowId(),
    leadingPaths: [],
  };
}

export function mixRowsToPayload(rows: MixRow[]): MixRowPayload[] {
  return rows.map((row) => ({
    id: row.id,
    leading_paths: [...row.leadingPaths],
    ...(row.chaptime?.trim() ? { chaptime: row.chaptime.trim() } : {}),
  }));
}

function readLeadingPaths(item: MixRowPayload & { leadingPaths?: unknown }): string[] {
  const snake = item.leading_paths;
  const camel = item.leadingPaths;
  const source = Array.isArray(snake) ? snake : Array.isArray(camel) ? camel : [];
  return source.filter((p) => typeof p === "string" && p.trim()).map((p) => p.trim());
}

function readChaptime(item: MixRowPayload & { chaptime?: unknown }): string | undefined {
  const raw = item.chaptime;
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function mixRowsFromPayload(raw: MixRowPayload[] | undefined): MixRow[] {
  if (!raw?.length) {
    return [];
  }
  return raw
    .filter((item) => typeof item.id === "string" && item.id.trim())
    .map((item) => ({
      id: item.id.trim(),
      leadingPaths: readLeadingPaths(item as MixRowPayload & { leadingPaths?: unknown }),
      chaptime: readChaptime(item as MixRowPayload & { chaptime?: unknown }),
    }));
}

function newMixRowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mix-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
