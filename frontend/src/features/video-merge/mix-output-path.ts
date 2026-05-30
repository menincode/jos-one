import type {
  VideoMergeJobOutput,
  VideoMergeRowJobState,
} from "@/lib/pywebview/types";

/** `mix-{rowId}.{ext}` under the configured output folder (Windows or POSIX separators). */
export function buildMixOutputFilePath(
  outputFolder: string,
  rowId: string,
  format = "mp4",
): string {
  const folder = outputFolder.trim().replace(/[/\\]+$/, "");
  if (!folder || !rowId.trim()) {
    return "";
  }
  const ext = format.trim().replace(/^\./, "").toLowerCase() || "mp4";
  const separator = folder.includes("\\") ? "\\" : "/";
  return `${folder}${separator}mix-${rowId}.${ext}`;
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
): string | null {
  const fromJob = jobOutputs.find(
    (item) => item.row_id === rowId && item.ok && item.path.trim().length > 0,
  );
  if (fromJob) {
    return fromJob.path.trim();
  }
  const built = buildMixOutputFilePath(outputFolder, rowId, format);
  return built || null;
}
