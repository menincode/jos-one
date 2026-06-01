import {
  MAX_LEADING_VIDEOS_PER_ROW,
  MIN_LEADING_VIDEOS_PER_ROW,
  type MixRow,
} from "@/features/video-merge/mix-row-types";
import type { VideoFileItem } from "@/lib/pywebview/types";
import {
  buildVideoPathLookup,
  leadingPathsSemanticallyChanged,
  normalizePathKey,
  resolveCanonicalVideoPath,
} from "@/features/video-merge/video-path-utils";

export type MixValidationContext = {
  loading?: boolean;
  probingDurations: boolean;
  durationMinSec?: string;
  durationMaxSec?: string;
};

function parsePositiveSeconds(value: string | undefined): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }
  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function canToggleLeadingVideo(
  rows: MixRow[],
  rowId: string,
  path: string,
  selected: boolean,
): boolean {
  const row = rows.find((r) => r.id === rowId);
  if (!row) {
    return false;
  }
  if (selected) {
    return row.leadingPaths.some(
      (leadingPath) => normalizePathKey(leadingPath) === normalizePathKey(path),
    );
  }
  return row.leadingPaths.length < MAX_LEADING_VIDEOS_PER_ROW;
}

function validateMixRowCore(
  rowIndex: number,
  row: MixRow,
  videoPaths: Set<string>,
  videos: VideoFileItem[],
  durationMaxSec: number | null,
  lookup?: Map<string, string>,
): string | null {
  const count = row.leadingPaths.length;
  if (count < MIN_LEADING_VIDEOS_PER_ROW || count > MAX_LEADING_VIDEOS_PER_ROW) {
    return `Dòng ${rowIndex + 1}: chọn từ ${MIN_LEADING_VIDEOS_PER_ROW} đến ${MAX_LEADING_VIDEOS_PER_ROW} video đầu.`;
  }
  for (const path of row.leadingPaths) {
    const canonical = lookup ? resolveCanonicalVideoPath(path, lookup) : path;
    if (!canonical || !videoPaths.has(canonical)) {
      return `Dòng ${rowIndex + 1}: video không còn trong thư mục đầu vào.`;
    }
  }

  if (durationMaxSec != null && count >= MIN_LEADING_VIDEOS_PER_ROW) {
    const leadingTotal = sumLeadingDuration(row, videos);
    if (leadingTotal == null) {
      return null;
    }
    if (leadingTotal > durationMaxSec) {
      return `Dòng ${rowIndex + 1}: video đầu vượt quá thời lượng tối đa.`;
    }
  }

  return null;
}

function videoDisplayName(path: string, videos: VideoFileItem[]): string {
  const item = videos.find((video) => video.path === path);
  return item?.name ?? path.split(/[/\\]/).pop() ?? path;
}

/** Per-row validation; returns null while folder list is loading or probing durations. */
export function validateMixRowAtIndex(
  rowIndex: number,
  row: MixRow,
  videos: VideoFileItem[],
  ctx: MixValidationContext,
  _allRows?: MixRow[],
): string | null {
  if (ctx.loading || ctx.probingDurations) {
    return null;
  }

  const missingDuration = videos.some((v) => v.duration_sec == null);
  if (missingDuration) {
    return null;
  }

  const durationMaxSec = parsePositiveSeconds(ctx.durationMaxSec);
  const lookup = buildVideoPathLookup(videos);
  const coreError = validateMixRowCore(
    rowIndex,
    row,
    new Set(videos.map((v) => v.path)),
    videos,
    durationMaxSec,
    lookup,
  );
  if (coreError) {
    return coreError;
  }

  return null;
}

export function validateMixRowsForStart(
  rows: MixRow[],
  videos: VideoFileItem[],
  probingDurations: boolean,
  ctx?: MixValidationContext,
): string | null {
  const loading = ctx?.loading ?? false;
  if (loading || probingDurations) {
    return null;
  }

  if (rows.length === 0) {
    return "Thêm ít nhất một dòng mix.";
  }

  const lookup = buildVideoPathLookup(videos);
  const videoPaths = new Set(videos.map((v) => v.path));
  const missingDuration = videos.some((v) => v.duration_sec == null);
  if (missingDuration) {
    return "Chưa có thời lượng đủ cho tất cả video trong thư mục.";
  }

  const minSec = parsePositiveSeconds(ctx?.durationMinSec);
  const maxSec = parsePositiveSeconds(ctx?.durationMaxSec);
  if (minSec != null && maxSec != null && minSec > maxSec) {
    return "Thời lượng tối thiểu không được lớn hơn tối đa.";
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowError = validateMixRowCore(i, row, videoPaths, videos, maxSec, lookup);
    if (rowError) {
      return rowError;
    }
    const rowSeen = new Set<string>();
    for (const path of row.leadingPaths) {
      const canonical = resolveCanonicalVideoPath(path, lookup) ?? path;
      const key = normalizePathKey(canonical);
      if (rowSeen.has(key)) {
        const name = videoDisplayName(canonical, videos);
        return `Dòng ${i + 1}: video bị trùng trong cùng mix (${name}).`;
      }
      rowSeen.add(key);
    }
  }

  return null;
}

export type MixRowStatus = "empty" | "invalid" | "ready" | "loading";

export function getMixRowStatus(
  row: MixRow,
  options?: {
    rowIndex?: number;
    videos?: VideoFileItem[];
    validation?: MixValidationContext;
    allRows?: MixRow[];
  },
): MixRowStatus {
  if (options?.validation?.loading || options?.validation?.probingDurations) {
    return "loading";
  }

  const count = row.leadingPaths.length;
  if (count === 0) {
    return "empty";
  }
  if (count < MIN_LEADING_VIDEOS_PER_ROW || count > MAX_LEADING_VIDEOS_PER_ROW) {
    return "invalid";
  }

  if (
    options?.videos != null &&
    options.rowIndex != null &&
    options.validation != null
  ) {
    const rowError = validateMixRowAtIndex(
      options.rowIndex,
      row,
      options.videos,
      options.validation,
      options.allRows,
    );
    if (rowError) {
      return "invalid";
    }
  }

  return "ready";
}

export const MIX_ROW_STATUS_LABELS: Record<MixRowStatus, string> = {
  empty: "Chưa chọn",
  invalid: "Chưa hợp lệ",
  ready: "Sẵn sàng",
  loading: "Đang tải…",
};

export function getMixRowStatusLabel(
  row: MixRow,
  options?: {
    rowIndex?: number;
    videos?: VideoFileItem[];
    validation?: MixValidationContext;
    allRows?: MixRow[];
  },
): string {
  if (options?.validation?.loading) {
    return "Đang quét video…";
  }
  if (options?.validation?.probingDurations) {
    return "Đang đọc thời lượng…";
  }

  const status = getMixRowStatus(row, options);
  if (status === "invalid") {
    return MIX_ROW_STATUS_LABELS.invalid;
  }

  return MIX_ROW_STATUS_LABELS[status];
}

export function sumLeadingDuration(
  row: MixRow,
  videos: VideoFileItem[],
): number | null {
  const lookup = buildVideoPathLookup(videos);
  let total = 0;
  for (const path of row.leadingPaths) {
    const canonical = resolveCanonicalVideoPath(path, lookup) ?? path;
    const item = videos.find((v) => v.path === canonical);
    if (!item || item.duration_sec == null) {
      return null;
    }
    total += item.duration_sec;
  }
  return total;
}

export function buildMixValidationContext(params: {
  loading: boolean;
  probingDurations: boolean;
  durationMinSec?: string;
  durationMaxSec?: string;
}): MixValidationContext {
  return {
    loading: params.loading,
    probingDurations: params.probingDurations,
    durationMinSec: params.durationMinSec,
    durationMaxSec: params.durationMaxSec,
  };
}

/** Returns `Mix #N` (or multiple mix numbers) when path is a leading video. */
export function getVideoMixUsageLabel(path: string, mixRows: MixRow[]): string | null {
  const pathKey = normalizePathKey(path);
  const mixNumbers: number[] = [];
  for (let i = 0; i < mixRows.length; i += 1) {
    const used = mixRows[i].leadingPaths.some(
      (leadingPath) => normalizePathKey(leadingPath) === pathKey,
    );
    if (used) {
      mixNumbers.push(i + 1);
    }
  }
  if (mixNumbers.length === 0) {
    return null;
  }
  if (mixNumbers.length === 1) {
    return `Mix #${mixNumbers[0]}`;
  }
  return `Mix #${mixNumbers.join(", #")}`;
}

export type SetMixRowLeadingVideosResult =
  | { ok: true; rows: MixRow[] }
  | { ok: false; error: string; rows: MixRow[] };

/** Replace a mix row's leading videos with the selected paths (allows removing via uncheck). */
export function setLeadingVideosForRow(
  rows: MixRow[],
  rowId: string,
  paths: string[],
): SetMixRowLeadingVideosResult {
  const rowIndex = rows.findIndex((r) => r.id === rowId);
  if (rowIndex < 0) {
    return { ok: false, error: "Không tìm thấy mix đang chọn.", rows };
  }

  const seen = new Set<string>();
  const nextPaths: string[] = [];

  for (const path of paths) {
    const key = normalizePathKey(path);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    nextPaths.push(path);
  }

  if (nextPaths.length > MAX_LEADING_VIDEOS_PER_ROW) {
    return {
      ok: false,
      error: `Chọn tối đa ${MAX_LEADING_VIDEOS_PER_ROW} video cho mỗi mix.`,
      rows,
    };
  }

  const nextRows = rows.map((r) => {
    if (r.id !== rowId) {
      return r;
    }
    const pathsChanged = leadingPathsSemanticallyChanged(r.leadingPaths, nextPaths);
    return {
      ...r,
      leadingPaths: nextPaths,
      ...(pathsChanged ? { chaptime: undefined } : {}),
    };
  });
  return { ok: true, rows: nextRows };
}

export type AddLeadingVideosResult = SetMixRowLeadingVideosResult;

/** Append paths to a mix row's leading videos, respecting per-row and cross-row limits. */
export function addLeadingVideosToRow(
  rows: MixRow[],
  rowId: string,
  paths: string[],
): AddLeadingVideosResult {
  const rowIndex = rows.findIndex((r) => r.id === rowId);
  if (rowIndex < 0) {
    return { ok: false, error: "Không tìm thấy mix đang chọn.", rows };
  }

  const row = rows[rowIndex];
  const nextPaths = [...row.leadingPaths];

  for (const path of paths) {
    const key = normalizePathKey(path);
    if (nextPaths.some((existing) => normalizePathKey(existing) === key)) {
      continue;
    }
    if (nextPaths.length >= MAX_LEADING_VIDEOS_PER_ROW) {
      return {
        ok: false,
        error: `Mix #${rowIndex + 1} đã đủ ${MAX_LEADING_VIDEOS_PER_ROW} video đầu.`,
        rows,
      };
    }
    nextPaths.push(path);
  }

  const nextRows = rows.map((r) =>
    r.id === rowId ? { ...r, leadingPaths: nextPaths } : r,
  );
  return { ok: true, rows: nextRows };
}
