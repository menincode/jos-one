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
  concat: "Nối video",
};

const CLIP_PROGRESS_RE = /Clip\s+(\d+)\/(\d+)/i;

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
    const clip = CLIP_PROGRESS_RE.exec(trimmed);
    if (clip) {
      return `${base} · Clip ${clip[1]}/${clip[2]}`;
    }
  }

  return base;
}
