import type {
  VideoMergeJobOutput,
  VideoMergeRowJobState,
} from "@/lib/pywebview/types";

const WINDOWS_INVALID = /[<>:"/\\|?*]/g;

function sanitizeMixOutputStem(stem: string): string {
  const cleaned = stem
    .trim()
    .replace(WINDOWS_INVALID, "")
    .replace(/\s+/g, " ")
    .replace(/^[ .]+|[ .]+$/g, "");
  return cleaned || "video";
}

function firstVideoStem(sourcePath: string): string {
  const clean = sourcePath.trim();
  if (!clean) {
    return "video";
  }
  const leaf = clean.split(/[/\\]/).filter(Boolean).at(-1) ?? clean;
  const dot = leaf.lastIndexOf(".");
  const stem = dot > 0 ? leaf.slice(0, dot) : leaf;
  return sanitizeMixOutputStem(stem);
}

function formatMixOutputTimestamp(at: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}_` +
    `${pad(at.getHours())}${pad(at.getMinutes())}`
  );
}

/** ``yyyyMMdd_HHmm_{firstVideoStem}.{ext}`` under the configured output folder. */
export function buildMixOutputFilePath(
  outputFolder: string,
  firstVideoPath: string,
  format = "mp4",
  at: Date = new Date(),
): string {
  const folder = outputFolder.trim().replace(/[/\\]+$/, "");
  if (!folder || !firstVideoPath.trim()) {
    return "";
  }
  const ext = format.trim().replace(/^\./, "").toLowerCase() || "mp4";
  const separator = folder.includes("\\") ? "\\" : "/";
  const stamp = formatMixOutputTimestamp(at);
  const stem = firstVideoStem(firstVideoPath);
  return `${folder}${separator}${stamp}_${stem}.${ext}`;
}

/** True when this mix row has a successful job output with a filesystem path. */
function hasOkOutput(rowId: string, jobOutputs: VideoMergeJobOutput[]): boolean {
  return jobOutputs.some(
    (item) =>
      item.row_id === rowId && item.ok && item.path.trim().length > 0,
  );
}

/** True when preview is allowed: requires ok output path from the merge job. */
export function canPreviewMixRow(
  rowId: string,
  jobOutputs: VideoMergeJobOutput[],
  _rowJobStates?: Record<string, VideoMergeRowJobState>,
): boolean {
  return hasOkOutput(rowId, jobOutputs);
}

export function resolveMixPreviewPath(
  rowId: string,
  outputFolder: string,
  format: string,
  jobOutputs: VideoMergeJobOutput[],
  firstVideoPath?: string,
): string | null {
  const fromJob = jobOutputs.find(
    (item) => item.row_id === rowId && item.ok && item.path.trim().length > 0,
  );
  if (fromJob) {
    return fromJob.path.trim();
  }
  if (!firstVideoPath?.trim()) {
    return null;
  }
  const built = buildMixOutputFilePath(outputFolder, firstVideoPath, format);
  return built || null;
}
