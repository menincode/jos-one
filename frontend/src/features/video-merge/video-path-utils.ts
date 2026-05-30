import type { MixRow } from "@/features/video-merge/mix-row-types";
import type { VideoFileItem } from "@/lib/pywebview/types";

/** Stable comparison key (Windows-friendly: lowercased backslashes). */
export function normalizePathKey(path: string): string {
  const clean = path.trim();
  if (!clean) {
    return "";
  }
  return clean.replace(/\//g, "\\").toLowerCase();
}

export function buildVideoPathLookup(
  videos: VideoFileItem[],
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const video of videos) {
    const key = normalizePathKey(video.path);
    if (key && !lookup.has(key)) {
      lookup.set(key, video.path);
    }
  }
  return lookup;
}

export function resolveCanonicalVideoPath(
  path: string,
  lookup: Map<string, string>,
): string | null {
  const key = normalizePathKey(path);
  if (!key) {
    return null;
  }
  return lookup.get(key) ?? null;
}

export type ReconcileMixRowsOptions = {
  /** Remove leading videos already used in an earlier mix row. */
  dedupeAcrossRows?: boolean;
  /** Assign the first unused catalog video when a row has no leading clips. */
  fillEmptyRows?: boolean;
};

export type ReconcileMixRowsResult = {
  rows: MixRow[];
  changed: boolean;
  message?: string;
};

export function reconcileMixRowsWithVideos(
  rows: MixRow[],
  videos: VideoFileItem[],
  options: ReconcileMixRowsOptions = {},
): ReconcileMixRowsResult {
  const { dedupeAcrossRows = false, fillEmptyRows = false } = options;
  if (!rows.length || !videos.length) {
    return { rows, changed: false };
  }

  const lookup = buildVideoPathLookup(videos);
  const usedKeys = new Set<string>();
  let changed = false;
  const messages: string[] = [];

  const nextRows = rows.map((row, rowIndex) => {
    const nextLeading: string[] = [];
    const seenInRow = new Set<string>();

    for (const raw of row.leadingPaths) {
      const trimmed = raw.trim();
      if (!trimmed) {
        continue;
      }
      const canonical = resolveCanonicalVideoPath(raw, lookup);
      if (!canonical) {
        // Keep paths until the folder scan catches up (avoid wiping saved mix on reload).
        const orphanKey = normalizePathKey(trimmed);
        if (seenInRow.has(orphanKey)) {
          changed = true;
          continue;
        }
        if (dedupeAcrossRows && usedKeys.has(orphanKey)) {
          changed = true;
          continue;
        }
        seenInRow.add(orphanKey);
        usedKeys.add(orphanKey);
        nextLeading.push(trimmed);
        continue;
      }
      const key = normalizePathKey(canonical);
      if (seenInRow.has(key)) {
        changed = true;
        continue;
      }
      if (dedupeAcrossRows && usedKeys.has(key)) {
        changed = true;
        messages.push(
          `Mix #${rowIndex + 1}: bỏ video trùng với mix trước (${videos.find((v) => v.path === canonical)?.name ?? canonical}).`,
        );
        continue;
      }
      seenInRow.add(key);
      usedKeys.add(key);
      if (canonical !== raw) {
        changed = true;
      }
      nextLeading.push(canonical);
    }

    if (fillEmptyRows && nextLeading.length === 0) {
      const unused = videos.find((video) => !usedKeys.has(normalizePathKey(video.path)));
      if (unused) {
        const key = normalizePathKey(unused.path);
        usedKeys.add(key);
        nextLeading.push(unused.path);
        changed = true;
        messages.push(`Mix #${rowIndex + 1}: gán video chưa dùng "${unused.name}".`);
      }
    }

    if (
      nextLeading.length !== row.leadingPaths.length ||
      nextLeading.some((path, index) => path !== row.leadingPaths[index])
    ) {
      changed = true;
    }

    return { ...row, leadingPaths: nextLeading };
  });

  return {
    rows: nextRows,
    changed,
    message: messages.length ? messages.join(" ") : undefined,
  };
}
