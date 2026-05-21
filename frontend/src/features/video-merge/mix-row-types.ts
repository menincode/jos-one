export const MAX_LEADING_VIDEOS_PER_ROW = 5;
export const MIN_LEADING_VIDEOS_PER_ROW = 1;

export type MixRow = {
  id: string;
  leadingPaths: string[];
};

export type MixRowPayload = {
  id: string;
  leading_paths: string[];
};

export function createEmptyMixRow(): MixRow {
  return {
    id: crypto.randomUUID(),
    leadingPaths: [],
  };
}

export function mixRowsToPayload(rows: MixRow[]): MixRowPayload[] {
  return rows.map((row) => ({
    id: row.id,
    leading_paths: [...row.leadingPaths],
  }));
}

export function mixRowsFromPayload(raw: MixRowPayload[] | undefined): MixRow[] {
  if (!raw?.length) {
    return [];
  }
  return raw
    .filter((item) => typeof item.id === "string" && item.id.trim())
    .map((item) => ({
      id: item.id.trim(),
      leadingPaths: Array.isArray(item.leading_paths)
        ? item.leading_paths.filter((p) => typeof p === "string" && p.trim())
        : [],
    }));
}
