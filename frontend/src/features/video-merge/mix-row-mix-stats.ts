import type {
  VideoMergeJobOutput,
  VideoMergeRowJobState,
} from "@/lib/pywebview/types";

/** Clip count after backend mix planner (leading + tail). */
export function mixClipCountForRow(
  rowId: string,
  rowJobStates?: Record<string, VideoMergeRowJobState>,
): number | null {
  const raw = rowJobStates?.[rowId]?.mix_clip_count;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  return null;
}

/** Planned total duration (sum of source clip lengths in sequence). */
export function mixTotalDurationForRow(
  rowId: string,
  rowJobStates?: Record<string, VideoMergeRowJobState>,
  jobOutputs?: VideoMergeJobOutput[],
): number | null {
  const planned = rowJobStates?.[rowId]?.mix_total_duration_sec;
  if (typeof planned === "number" && Number.isFinite(planned) && planned > 0) {
    return planned;
  }
  const output = jobOutputs?.find((item) => item.row_id === rowId && item.ok);
  const exported = output?.output_duration_sec;
  if (typeof exported === "number" && Number.isFinite(exported) && exported > 0) {
    return exported;
  }
  const live = rowJobStates?.[rowId]?.output_duration_sec;
  if (typeof live === "number" && Number.isFinite(live) && live > 0) {
    return live;
  }
  return null;
}

export function formatMixClipCount(count: number | null): string {
  if (count == null) {
    return "—";
  }
  return String(count);
}
