import {
  buildMixValidationContext,
  validateMixRowsForStart,
} from "@/features/video-merge/mix-row-utils";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import type { VideoFileItem } from "@/lib/pywebview/types";
import type { VideoMergeJobStatus } from "@/lib/pywebview/types";

/** UI status keys for the Ghép Video action bar (idle setup → job lifecycle). */
export type MergeFlowStatusKey =
  | "loading_settings"
  | "initializing"
  | "needs_input_folder"
  | "needs_output_folder"
  | "scanning_folder"
  | "probing_duration"
  | "no_videos"
  | "invalid_mix"
  | "ready"
  | "preparing"
  | "merging"
  | "done"
  | "error"
  | "cancelled";

export type MergeFlowStatusStyle = {
  bg: string;
  fg: string;
  border: string;
  pulse?: boolean;
};

export type MergeFlowStatusDisplay = {
  key: MergeFlowStatusKey;
  label: string;
  style: MergeFlowStatusStyle;
};

export const MERGE_FLOW_STATUS_STYLES: Record<MergeFlowStatusKey, MergeFlowStatusStyle> = {
  loading_settings: {
    bg: "rgba(142, 148, 165, 0.12)",
    fg: "#a8b0c4",
    border: "rgba(142, 148, 165, 0.28)",
    pulse: true,
  },
  initializing: {
    bg: "rgba(142, 148, 165, 0.12)",
    fg: "#a8b0c4",
    border: "rgba(142, 148, 165, 0.28)",
    pulse: true,
  },
  needs_input_folder: {
    bg: "rgba(245, 158, 11, 0.12)",
    fg: "#fbbf24",
    border: "rgba(245, 158, 11, 0.35)",
  },
  needs_output_folder: {
    bg: "rgba(245, 158, 11, 0.12)",
    fg: "#fbbf24",
    border: "rgba(245, 158, 11, 0.35)",
  },
  scanning_folder: {
    bg: "rgba(29, 185, 195, 0.12)",
    fg: "#1db9c3",
    border: "rgba(29, 185, 195, 0.3)",
    pulse: true,
  },
  probing_duration: {
    bg: "rgba(29, 185, 195, 0.12)",
    fg: "#1db9c3",
    border: "rgba(29, 185, 195, 0.3)",
    pulse: true,
  },
  no_videos: {
    bg: "rgba(245, 158, 11, 0.12)",
    fg: "#fbbf24",
    border: "rgba(245, 158, 11, 0.35)",
  },
  invalid_mix: {
    bg: "rgba(245, 158, 11, 0.12)",
    fg: "#fbbf24",
    border: "rgba(245, 158, 11, 0.35)",
  },
  ready: {
    bg: "rgba(34, 197, 94, 0.16)",
    fg: "#4ade80",
    border: "rgba(34, 197, 94, 0.4)",
  },
  preparing: {
    bg: "rgba(168, 180, 255, 0.14)",
    fg: "#a8b4ff",
    border: "rgba(168, 180, 255, 0.35)",
    pulse: true,
  },
  merging: {
    bg: "rgba(29, 185, 195, 0.16)",
    fg: "#1db9c3",
    border: "rgba(29, 185, 195, 0.45)",
    pulse: true,
  },
  done: {
    bg: "rgba(34, 197, 94, 0.16)",
    fg: "#4ade80",
    border: "rgba(34, 197, 94, 0.4)",
  },
  error: {
    bg: "rgba(244, 63, 94, 0.14)",
    fg: "#fb7185",
    border: "rgba(244, 63, 94, 0.4)",
  },
  cancelled: {
    bg: "rgba(142, 148, 165, 0.12)",
    fg: "#8e94a5",
    border: "rgba(142, 148, 165, 0.28)",
  },
};

const IDLE_HINT_KEYS: Record<string, MergeFlowStatusKey> = {
  "Đang tải cài đặt…": "loading_settings",
  "Đang khởi tạo…": "initializing",
  "Chọn thư mục đầu vào": "needs_input_folder",
  "Chọn thư mục đầu ra": "needs_output_folder",
  "Đang quét thư mục…": "scanning_folder",
  "Đang đọc thời lượng…": "probing_duration",
  "Chưa có video": "no_videos",
};

const IDLE_LABELS: Partial<Record<MergeFlowStatusKey, string>> = {
  loading_settings: "Đang tải cài đặt…",
  initializing: "Đang khởi tạo…",
  needs_input_folder: "Chọn thư mục đầu vào",
  needs_output_folder: "Chọn thư mục đầu ra",
  scanning_folder: "Đang quét thư mục…",
  probing_duration: "Đang đọc thời lượng…",
  no_videos: "Chưa có video",
  ready: "Sẵn sàng",
  preparing: "Đang chuẩn bị…",
  merging: "Đang ghép video…",
  done: "Hoàn tất",
  error: "Lỗi ghép video",
  cancelled: "Đã hủy",
};

export type ResolveMergeFlowStatusParams = {
  mergeStatus: VideoMergeJobStatus;
  jobMessage?: string;
  jobProgress?: number;
  jobTotal?: number;
  canStartMerge: boolean;
  startHint?: string;
};

function resolveIdleKey(startHint: string | undefined, canStartMerge: boolean): MergeFlowStatusKey {
  if (canStartMerge) {
    return "ready";
  }
  if (!startHint) {
    return "invalid_mix";
  }
  return IDLE_HINT_KEYS[startHint] ?? "invalid_mix";
}

function resolveIdleDisplay(
  startHint: string | undefined,
  canStartMerge: boolean,
): MergeFlowStatusDisplay {
  const key = resolveIdleKey(startHint, canStartMerge);
  const label =
    key === "ready"
      ? IDLE_LABELS.ready!
      : key === "invalid_mix"
        ? (startHint?.trim() || IDLE_LABELS.invalid_mix || "Chưa hợp lệ")
        : (IDLE_LABELS[key] ?? startHint?.trim() ?? "Chưa hợp lệ");

  return { key, label, style: MERGE_FLOW_STATUS_STYLES[key] };
}

function resolveRunningDisplay(
  jobMessage: string | undefined,
  jobProgress: number,
  jobTotal: number,
): MergeFlowStatusDisplay {
  const trimmed = jobMessage?.trim() ?? "";
  const inPreparing =
    trimmed.includes("chuẩn bị") || (jobTotal > 0 && jobProgress === 0);

  if (inPreparing) {
    return {
      key: "preparing",
      label: trimmed || IDLE_LABELS.preparing!,
      style: MERGE_FLOW_STATUS_STYLES.preparing,
    };
  }

  if (jobTotal > 0) {
    const label =
      trimmed ||
      (jobProgress > 0
        ? `Đang ghép ${jobProgress}/${jobTotal}…`
        : `Đang ghép 0/${jobTotal}…`);
    return {
      key: "merging",
      label,
      style: MERGE_FLOW_STATUS_STYLES.merging,
    };
  }

  return {
    key: "merging",
    label: trimmed || IDLE_LABELS.merging!,
    style: MERGE_FLOW_STATUS_STYLES.merging,
  };
}

export function resolveMergeFlowStatus(
  params: ResolveMergeFlowStatusParams,
): MergeFlowStatusDisplay {
  const { mergeStatus, jobMessage, jobProgress = 0, jobTotal = 0, canStartMerge, startHint } =
    params;

  if (mergeStatus === "running") {
    return resolveRunningDisplay(jobMessage, jobProgress, jobTotal);
  }

  if (mergeStatus === "done") {
    const label = jobMessage?.trim() || IDLE_LABELS.done!;
    return { key: "done", label, style: MERGE_FLOW_STATUS_STYLES.done };
  }

  if (mergeStatus === "error") {
    const label = jobMessage?.trim() || IDLE_LABELS.error!;
    return { key: "error", label, style: MERGE_FLOW_STATUS_STYLES.error };
  }

  if (mergeStatus === "cancelled") {
    const label = jobMessage?.trim() || IDLE_LABELS.cancelled!;
    return { key: "cancelled", label, style: MERGE_FLOW_STATUS_STYLES.cancelled };
  }

  return resolveIdleDisplay(startHint, canStartMerge);
}

/** Build start hint string for idle blocking (used with {@link resolveMergeFlowStatus}). */
export function getStartMergeHint(params: {
  hydrated: boolean;
  settingsLoading: boolean;
  inputFolder: string;
  outputFolder: string;
  videos: VideoFileItem[];
  loading: boolean;
  probingDurations: boolean;
  mixRows: MixRow[];
  isRunning: boolean;
  durationMinSec?: string;
  durationMaxSec?: string;
}): string | undefined {
  if (params.isRunning) {
    return undefined;
  }
  if (params.settingsLoading) {
    return IDLE_LABELS.loading_settings;
  }
  if (!params.hydrated) {
    return IDLE_LABELS.initializing;
  }
  if (!params.inputFolder.trim()) {
    return IDLE_LABELS.needs_input_folder;
  }
  if (!params.outputFolder.trim()) {
    return IDLE_LABELS.needs_output_folder;
  }
  if (params.loading) {
    return IDLE_LABELS.scanning_folder;
  }
  if (params.probingDurations) {
    return IDLE_LABELS.probing_duration;
  }
  if (params.videos.length === 0) {
    return IDLE_LABELS.no_videos;
  }
  const validation = buildMixValidationContext({
    loading: params.loading,
    probingDurations: params.probingDurations,
    durationMinSec: params.durationMinSec,
    durationMaxSec: params.durationMaxSec,
  });
  return (
    validateMixRowsForStart(params.mixRows, params.videos, params.probingDurations, validation) ??
    undefined
  );
}
