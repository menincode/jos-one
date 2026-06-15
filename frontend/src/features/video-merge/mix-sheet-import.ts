import {
  createEmptyMixRow,
  MAX_LEADING_VIDEOS_PER_ROW,
  type MixRow,
} from "@/features/video-merge/mix-row-types";
import type { VideoFileItem } from "@/lib/pywebview/types";

export const DEFAULT_MIX_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1XkvGrqXptuBelDIN3CHtoF0O5DIU2OlaCXGPtGPwPgA/edit?usp=sharing";

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v", ".wmv"];

export type ResolveVideoByCellResult =
  | { ok: true; path: string }
  | { ok: false; reason: "not_found" | "ambiguous"; names?: string[] };

export type MixSheetImportResult =
  | { ok: true; rows: MixRow[]; warnings: string[] }
  | { ok: false; error: string; warnings: string[] };

function fileStem(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

function buildVideoNameLookup(videos: VideoFileItem[]): {
  byExactName: Map<string, string>;
  byStem: Map<string, string[]>;
} {
  const byExactName = new Map<string, string>();
  const byStem = new Map<string, string[]>();

  for (const video of videos) {
    const exactKey = video.name.toLowerCase();
    if (!byExactName.has(exactKey)) {
      byExactName.set(exactKey, video.path);
    }

    const stemKey = fileStem(video.name).toLowerCase();
    const bucket = byStem.get(stemKey) ?? [];
    if (!bucket.includes(video.name)) {
      bucket.push(video.name);
      byStem.set(stemKey, bucket);
    }
  }

  return { byExactName, byStem };
}

export function resolveVideoByCellName(
  cell: string,
  videos: VideoFileItem[],
): ResolveVideoByCellResult {
  const trimmed = cell.trim();
  if (!trimmed) {
    return { ok: false, reason: "not_found" };
  }

  const lookup = buildVideoNameLookup(videos);
  const lower = trimmed.toLowerCase();

  const exact = lookup.byExactName.get(lower);
  if (exact) {
    return { ok: true, path: exact };
  }

  const hasExtension = VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (hasExtension) {
    return { ok: false, reason: "not_found" };
  }

  const stemMatches = lookup.byStem.get(lower) ?? [];
  if (stemMatches.length === 1) {
    const path = videos.find((v) => v.name === stemMatches[0])?.path;
    if (path) {
      return { ok: true, path };
    }
  }
  if (stemMatches.length > 1) {
    return { ok: false, reason: "ambiguous", names: stemMatches };
  }

  return { ok: false, reason: "not_found" };
}

function isRowEmpty(row: string[]): boolean {
  return row.every((cell) => !String(cell ?? "").trim());
}

function columnLabel(colIndex: number): string {
  return String(colIndex + 1);
}

export function buildMixRowsFromSheet(
  sheetRows: string[][],
  videos: VideoFileItem[],
): MixSheetImportResult {
  const warnings: string[] = [];

  if (!sheetRows.length) {
    return { ok: false, error: "Sheet trống.", warnings };
  }

  if (sheetRows.length < 2) {
    return {
      ok: false,
      error: "Sheet không có dữ liệu (chỉ có header hoặc trống).",
      warnings,
    };
  }

  const dataRows = sheetRows.slice(1);
  const mixRows: MixRow[] = [];

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
    const row = dataRows[rowIndex];
    if (isRowEmpty(row)) {
      continue;
    }

    const sheetRowNum = rowIndex + 2;
    const leadingPaths: string[] = [];
    let truncated = false;

    for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
      const cell = String(row[colIndex] ?? "").trim();
      if (!cell) {
        continue;
      }

      if (leadingPaths.length >= MAX_LEADING_VIDEOS_PER_ROW) {
        truncated = true;
        break;
      }

      const resolved = resolveVideoByCellName(cell, videos);
      if (resolved.ok) {
        if (!leadingPaths.includes(resolved.path)) {
          leadingPaths.push(resolved.path);
        }
        continue;
      }

      const col = columnLabel(colIndex);
      if (resolved.reason === "ambiguous") {
        warnings.push(
          `Dòng ${sheetRowNum}, cột ${col}: "${cell}" khớp nhiều file (${resolved.names?.join(", ") ?? ""}).`,
        );
      } else {
        warnings.push(
          `Dòng ${sheetRowNum}, cột ${col}: không tìm thấy "${cell}" trong thư mục đầu vào.`,
        );
      }
    }

    if (truncated) {
      warnings.push(
        `Dòng ${sheetRowNum}: vượt quá ${MAX_LEADING_VIDEOS_PER_ROW} video — chỉ lấy ${MAX_LEADING_VIDEOS_PER_ROW} video đầu.`,
      );
    }

    if (leadingPaths.length === 0) {
      warnings.push(`Dòng ${sheetRowNum}: bỏ qua — không có video hợp lệ.`);
      continue;
    }

    mixRows.push({ ...createEmptyMixRow(), leadingPaths });
  }

  if (mixRows.length === 0) {
    return {
      ok: false,
      error: "Không tạo được mix nào từ sheet.",
      warnings,
    };
  }

  return { ok: true, rows: mixRows, warnings };
}
