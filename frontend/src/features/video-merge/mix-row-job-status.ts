import {
  getMixRowStatus,
  getMixRowStatusLabel,
  type MixValidationContext,
  validateMixRowAtIndex,
  type MixRowStatus,
} from "@/features/video-merge/mix-row-utils";
import { resolveMixRowPipelineLabel } from "@/features/video-merge/mix-row-pipeline-phase";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import type { VideoFileItem, VideoMergeRowJobState } from "@/lib/pywebview/types";

export type MixRowDisplayStatus =
  | MixRowStatus
  | "pending"
  | "running"
  | "done"
  | "merge_error"
  | "cancelled";

export type MixRowDisplay = {
  key: MixRowDisplayStatus;
  label: string;
  errorMessage?: string;
  showErrorInfo: boolean;
  pulse?: boolean;
};

const JOB_STATUS_STYLES: Record<
  Exclude<MixRowDisplayStatus, MixRowStatus>,
  { bg: string; fg: string; pulse?: boolean }
> = {
  pending: { bg: "rgba(142, 148, 165, 0.15)", fg: "#8e94a5", pulse: true },
  running: { bg: "rgba(29, 185, 195, 0.15)", fg: "#1db9c3", pulse: true },
  done: { bg: "rgba(34, 197, 94, 0.15)", fg: "#4ade80" },
  merge_error: { bg: "rgba(244, 63, 94, 0.15)", fg: "#fb7185" },
  cancelled: { bg: "rgba(142, 148, 165, 0.15)", fg: "#8e94a5" },
};

const CONFIG_STATUS_STYLES: Record<MixRowStatus, { bg: string; fg: string; pulse?: boolean }> = {
  empty: { bg: "rgba(142, 148, 165, 0.15)", fg: "#8e94a5" },
  invalid: { bg: "rgba(245, 158, 11, 0.15)", fg: "#fbbf24" },
  ready: { bg: "rgba(29, 185, 195, 0.15)", fg: "#1db9c3" },
  loading: { bg: "rgba(29, 185, 195, 0.12)", fg: "#1db9c3", pulse: true },
};

const JOB_LABELS: Record<Exclude<MixRowDisplayStatus, MixRowStatus>, string> = {
  pending: "Chờ xử lý",
  running: "Đang xử lý",
  done: "Hoàn tất",
  merge_error: "Xử lý lỗi",
  cancelled: "Đã hủy",
};

const CLIP_PROGRESS_RE = /Clip\s+(\d+)\/(\d+)/i;
const MERGE_PROGRESS_RE = /^Ghép\s+clip\s+(\d+)\/(\d+)/i;

/** Short badge text for the status column while a row is encoding. */
export function runningStatusShortLabel(
  message: string,
  pipelinePhase?: string,
): string {
  const trimmed = message.trim();
  if (pipelinePhase?.trim()) {
    const fromPhase = resolveMixRowPipelineLabel(pipelinePhase, trimmed);
    if (fromPhase) {
      return fromPhase.length <= 28 ? fromPhase : `${fromPhase.slice(0, 26)}…`;
    }
  }
  if (!trimmed) {
    return JOB_LABELS.running;
  }
  const head = trimmed.split(" · ", 1)[0]?.trim() ?? trimmed;
  const clip = CLIP_PROGRESS_RE.exec(trimmed) ?? CLIP_PROGRESS_RE.exec(head);
  if (clip) {
    return `Chuẩn hóa · Clip ${clip[1]}/${clip[2]}`;
  }
  const phase = head;
  const merge = MERGE_PROGRESS_RE.exec(phase);
  if (merge) {
    return `Ghép ${merge[1]}/${merge[2]}`;
  }
  if (/nối video/i.test(phase)) {
    return /logo/i.test(phase) ? "Nối video (thêm logo)" : "Nối video";
  }
  if (/chuẩn hóa/i.test(phase)) {
    return phase.length <= 24 ? phase : `${phase.slice(0, 22)}…`;
  }
  if (/mix video/i.test(phase)) {
    return "Mix video";
  }
  if (/logo/i.test(phase)) {
    return "Nối video (thêm logo)";
  }
  if (/ghi file/i.test(phase)) {
    return "Ghi file";
  }
  if (phase.length <= 20) {
    return phase;
  }
  return `${phase.slice(0, 18)}…`;
}

/** Short badge when a row finished successfully. */
export function doneStatusShortLabel(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return JOB_LABELS.done;
  }
  const speed = /speed\s+([\d.]+)x/i.exec(trimmed);
  const duration = /Thời lượng xuất \(FFmpeg\):\s*([\d.]+)\s*s/i.exec(trimmed);
  const parts: string[] = ["Xong"];
  if (duration) {
    const sec = Number.parseFloat(duration[1]);
    if (Number.isFinite(sec) && sec > 0) {
      parts.push(sec < 60 ? `${sec.toFixed(0)}s` : `${Math.round(sec)}s`);
    }
  }
  if (speed) {
    const mult = Number.parseFloat(speed[1]);
    if (Number.isFinite(mult) && mult > 0) {
      parts.push(`${mult.toFixed(1)}x`);
    }
  }
  return parts.length > 1 ? parts.join(" · ") : JOB_LABELS.done;
}

export function resolveMixRowDisplay(
  row: MixRow,
  rowIndex: number,
  videos: VideoFileItem[],
  jobState: VideoMergeRowJobState | undefined,
  jobActive: boolean,
  validation?: MixValidationContext,
  allRows?: MixRow[],
): MixRowDisplay {
  if (jobState?.status === "cancelled") {
    return {
      key: "cancelled",
      label: JOB_LABELS.cancelled,
      showErrorInfo: false,
    };
  }

  if (jobState?.status === "error") {
    const message = jobState.message?.trim() || "Ghép video thất bại.";
    return {
      key: "merge_error",
      label: JOB_LABELS.merge_error,
      errorMessage: message,
      showErrorInfo: true,
    };
  }

  if (jobState?.status === "running") {
    const detail = jobState.message?.trim() ?? "";
    const phase = jobState.phase?.trim();
    return {
      key: "running",
      label: runningStatusShortLabel(detail, phase),
      errorMessage: detail || undefined,
      showErrorInfo: detail.length > 0,
      pulse: true,
    };
  }

  if (jobState?.status === "pending" && jobActive) {
    return {
      key: "pending",
      label: JOB_LABELS.pending,
      showErrorInfo: false,
      pulse: true,
    };
  }

  if (jobState?.status === "done") {
    const detail = jobState.message?.trim() ?? "";
    return {
      key: "done",
      label: doneStatusShortLabel(detail),
      errorMessage: detail || undefined,
      showErrorInfo: detail.length > 0,
    };
  }

  const rowOptions = { rowIndex, videos, validation, allRows };
  const configStatus = getMixRowStatus(row, rowOptions);
  const label = getMixRowStatusLabel(row, rowOptions);
  const rowError =
    validation != null
      ? validateMixRowAtIndex(rowIndex, row, videos, validation, allRows)
      : null;

  return {
    key: configStatus,
    label,
    errorMessage: rowError ?? undefined,
    showErrorInfo: configStatus === "invalid" && Boolean(rowError),
    pulse: configStatus === "loading",
  };
}

export function getMixRowDisplayStyle(display: MixRowDisplay): {
  bg: string;
  fg: string;
  pulse?: boolean;
} {
  if (display.key in JOB_STATUS_STYLES) {
    return JOB_STATUS_STYLES[display.key as keyof typeof JOB_STATUS_STYLES];
  }
  return CONFIG_STATUS_STYLES[display.key as MixRowStatus];
}
