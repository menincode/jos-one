import {
  getStartMergeHint as getStartMergeHintFromFlow,
  type ResolveMergeFlowStatusParams,
  resolveMergeFlowStatus,
} from "@/features/video-merge/merge-flow-status";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import {
  buildMixValidationContext,
  validateMixRowsForStart,
} from "@/features/video-merge/mix-row-utils";
import type { VideoFileItem } from "@/lib/pywebview/types";
import type { VideoMergeJobStatus } from "@/lib/pywebview/types";

export type StartMergeHintParams = {
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
};

export function getCanOpenOutputFolder(outputFolder: string, settingsLoading: boolean): boolean {
  return outputFolder.trim().length > 0 && !settingsLoading;
}

export function getCanStartMerge(params: StartMergeHintParams): boolean {
  const {
    hydrated,
    settingsLoading,
    inputFolder,
    outputFolder,
    videos,
    loading,
    probingDurations,
    mixRows,
    isRunning,
  } = params;
  if (
    !hydrated ||
    settingsLoading ||
    !inputFolder.trim() ||
    !outputFolder.trim() ||
    videos.length === 0 ||
    loading ||
    probingDurations ||
    isRunning
  ) {
    return false;
  }
  const validation = buildMixValidationContext({
    loading,
    probingDurations,
    durationMinSec: params.durationMinSec,
    durationMaxSec: params.durationMaxSec,
  });
  return validateMixRowsForStart(mixRows, videos, probingDurations, validation) === null;
}

export function getStartMergeHint(params: StartMergeHintParams): string | undefined {
  return getStartMergeHintFromFlow(params);
}

export function resolveVideoMergeActionStatus(
  params: StartMergeHintParams & {
    mergeStatus: VideoMergeJobStatus;
    jobMessage?: string;
    jobProgress?: number;
    jobTotal?: number;
  },
) {
  const canStartMerge = getCanStartMerge(params);
  const startHint = getStartMergeHint(params);
  const resolveParams: ResolveMergeFlowStatusParams = {
    mergeStatus: params.mergeStatus,
    jobMessage: params.jobMessage,
    jobProgress: params.jobProgress,
    jobTotal: params.jobTotal,
    canStartMerge,
    startHint,
  };
  return resolveMergeFlowStatus(resolveParams);
}
