/** Per-row pipeline phases from Python `row_states[].phase`. */
export type MixRowPipelinePhase =
  | "processing"
  | "mix_video"
  | "normalize"
  | "concat";

export const MIX_ROW_PIPELINE_PHASE_LABELS: Record<MixRowPipelinePhase, string> = {
  processing: "Đang xử lý",
  mix_video: "Mix video",
  normalize: "Chuẩn hóa",
  concat: "Ghép video",
};

const CLIP_PROGRESS_RE = /Clip\s+(\d+)\/(\d+)/i;

/** Status badge while normalizing clips in a mix row, e.g. `Chuẩn hóa 4/10`. */
export function formatNormalizeProgressLabel(current: string, total: string): string {
  return `${MIX_ROW_PIPELINE_PHASE_LABELS.normalize} ${current}/${total}`;
}

export function parseClipProgressFromMessage(
  message: string,
): { current: string; total: string } | null {
  const clip = CLIP_PROGRESS_RE.exec(message.trim());
  if (!clip) {
    return null;
  }
  return { current: clip[1], total: clip[2] };
}

function isMixRowPipelinePhase(value: string): value is MixRowPipelinePhase {
  return value in MIX_ROW_PIPELINE_PHASE_LABELS;
}

/** Badge label for a running row from bridge phase + detail message. */
export function resolveMixRowPipelineLabel(
  phase: string | undefined,
  message: string,
): string {
  const trimmed = message.trim();
  if (!phase || !isMixRowPipelinePhase(phase)) {
    return trimmed;
  }

  const base = MIX_ROW_PIPELINE_PHASE_LABELS[phase];

  if (phase === "normalize") {
    const clip = parseClipProgressFromMessage(trimmed);
    if (clip) {
      return formatNormalizeProgressLabel(clip.current, clip.total);
    }
  }

  return base;
}
