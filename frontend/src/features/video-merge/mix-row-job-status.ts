import {
  getMixRowStatus,
  getMixRowStatusLabel,
  type MixValidationContext,
  validateMixRowAtIndex,
  type MixRowStatus,
} from "@/features/video-merge/mix-row-utils";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import type { VideoFileItem, VideoMergeRowJobState } from "@/lib/pywebview/types";

export type MixRowDisplayStatus =
  | MixRowStatus
  | "pending"
  | "running"
  | "done"
  | "merge_error";

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
};

const CONFIG_STATUS_STYLES: Record<MixRowStatus, { bg: string; fg: string; pulse?: boolean }> = {
  empty: { bg: "rgba(142, 148, 165, 0.15)", fg: "#8e94a5" },
  invalid: { bg: "rgba(245, 158, 11, 0.15)", fg: "#fbbf24" },
  ready: { bg: "rgba(29, 185, 195, 0.15)", fg: "#1db9c3" },
  loading: { bg: "rgba(29, 185, 195, 0.12)", fg: "#1db9c3", pulse: true },
};

const JOB_LABELS: Record<Exclude<MixRowDisplayStatus, MixRowStatus>, string> = {
  pending: "Chờ xử lý",
  running: "Đang ghép",
  done: "Hoàn tất",
  merge_error: "Xử lý lỗi",
};

export function resolveMixRowDisplay(
  row: MixRow,
  rowIndex: number,
  videos: VideoFileItem[],
  jobState: VideoMergeRowJobState | undefined,
  jobActive: boolean,
  validation?: MixValidationContext,
): MixRowDisplay {
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
    return {
      key: "running",
      label: JOB_LABELS.running,
      showErrorInfo: false,
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
    return {
      key: "done",
      label: JOB_LABELS.done,
      showErrorInfo: false,
    };
  }

  const configStatus = getMixRowStatus(row, { rowIndex, videos, validation });
  const label = getMixRowStatusLabel(row, { rowIndex, videos, validation });
  const rowError =
    validation != null
      ? validateMixRowAtIndex(rowIndex, row, videos, validation)
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
