import {
  MAX_LEADING_VIDEOS_PER_ROW,
  MIN_LEADING_VIDEOS_PER_ROW,
  type MixRow,
} from "@/features/video-merge/mix-row-types";
import type { VideoFileItem } from "@/lib/pywebview/types";

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

export function pathsUsedInOtherRows(rows: MixRow[], rowId: string): Set<string> {
  const used = new Set<string>();
  for (const row of rows) {
    if (row.id === rowId) {
      continue;
    }
    for (const path of row.leadingPaths) {
      used.add(path);
    }
  }
  return used;
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
    return row.leadingPaths.includes(path);
  }
  if (row.leadingPaths.length >= MAX_LEADING_VIDEOS_PER_ROW) {
    return false;
  }
  return !pathsUsedInOtherRows(rows, rowId).has(path);
}

function validateMixRowCore(
  rowIndex: number,
  row: MixRow,
  videoPaths: Set<string>,
  videos: VideoFileItem[],
  durationMaxSec: number | null,
): string | null {
  const count = row.leadingPaths.length;
  if (count < MIN_LEADING_VIDEOS_PER_ROW || count > MAX_LEADING_VIDEOS_PER_ROW) {
    return `Dòng ${rowIndex + 1}: chọn từ ${MIN_LEADING_VIDEOS_PER_ROW} đến ${MAX_LEADING_VIDEOS_PER_ROW} video đầu.`;
  }
  for (const path of row.leadingPaths) {
    if (!videoPaths.has(path)) {
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

/** Per-row validation; returns null while folder list is loading or probing durations. */
export function validateMixRowAtIndex(
  rowIndex: number,
  row: MixRow,
  videos: VideoFileItem[],
  ctx: MixValidationContext,
): string | null {
  if (ctx.loading || ctx.probingDurations) {
    return null;
  }

  const missingDuration = videos.some((v) => v.duration_sec == null);
  if (missingDuration) {
    return null;
  }

  const durationMaxSec = parsePositiveSeconds(ctx.durationMaxSec);
  return validateMixRowCore(
    rowIndex,
    row,
    new Set(videos.map((v) => v.path)),
    videos,
    durationMaxSec,
  );
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

  const seen = new Set<string>();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowError = validateMixRowCore(i, row, videoPaths, videos, maxSec);
    if (rowError) {
      return rowError;
    }
    for (const path of row.leadingPaths) {
      if (seen.has(path)) {
        return "Mỗi video chỉ được chọn làm video đầu ở một dòng.";
      }
      seen.add(path);
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
  },
): string {
  if (options?.validation?.loading) {
    return "Đang quét video…";
  }
  if (options?.validation?.probingDurations) {
    return "Đang đọc thời lượng…";
  }

  const status = getMixRowStatus(row, options);
  if (status === "invalid" && options?.videos != null && options.rowIndex != null && options.validation) {
    return (
      validateMixRowAtIndex(options.rowIndex, row, options.videos, options.validation) ??
      MIX_ROW_STATUS_LABELS.invalid
    );
  }

  return MIX_ROW_STATUS_LABELS[status];
}

export function sumLeadingDuration(
  row: MixRow,
  videos: VideoFileItem[],
): number | null {
  let total = 0;
  for (const path of row.leadingPaths) {
    const item = videos.find((v) => v.path === path);
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
