import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppPage, WorkspacePanel } from "@/components/layout";
import { AppToneButton } from "@/components/common/app-tone-button";
import { VideoMergeFolderExportSection } from "@/features/video-merge/video-merge-folder-export-section";
import { usePersistedVideoMergeState } from "@/features/video-merge/use-persisted-video-merge-state";
import { useVideoList } from "@/features/video-merge/use-video-list";
import { useVideoMergeJob } from "@/features/video-merge/use-video-merge-job";
import {
  getCanOpenOutputFolder,
  getCanStartMerge,
  getStartMergeHint,
  resolveVideoMergeActionStatus,
} from "@/features/video-merge/get-start-merge-hint";
import {
  buildMixValidationContext,
  validateMixRowsForStart,
} from "@/features/video-merge/mix-row-utils";
import { MixVideoPanel } from "@/features/video-merge/mix-video-panel";
import { VideoFilesTable } from "@/features/video-merge/video-files-table";
import { cn } from "@/lib/utils";
export function VideoMergePage() {
  const {
    hydrated,
    settingsLoading,
    inputFolder,
    outputFolder,
    exportSettings,
    mixRows,
    setInputFolder,
    setOutputFolder,
    patchExportSettings,
    addMixRow,
    removeMixRow,
    clearAllMixRows,
    toggleMixRowLeadingVideo,
  } = usePersistedVideoMergeState();
  const { videos, loading, probingDurations, refresh } = useVideoList(
    hydrated ? inputFolder : "",
  );
  const {
    isRunning,
    status: mergeStatus,
    jobMessage,
    jobProgress,
    jobTotal,
    rowJobStates,
    start,
    cancel,
  } = useVideoMergeJob();

  const hasInputFolder = Boolean(inputFolder.trim());
  const videoCountLabel =
    inputFolder.trim() && !loading ? String(videos.length) : undefined;
  const mixValidation = buildMixValidationContext({
    loading,
    probingDurations,
    durationMinSec: exportSettings.durationMinSec,
    durationMaxSec: exportSettings.durationMaxSec,
  });
  const mixRowsError = validateMixRowsForStart(
    mixRows,
    videos,
    probingDurations,
    mixValidation,
  );

  const startHintParams = {
    hydrated,
    settingsLoading,
    inputFolder,
    outputFolder,
    videos,
    loading,
    probingDurations,
    mixRows,
    isRunning,
    durationMinSec: exportSettings.durationMinSec,
    durationMaxSec: exportSettings.durationMaxSec,
  };

  const canOpenOutputFolder = getCanOpenOutputFolder(outputFolder, settingsLoading);
  const canStartMerge = getCanStartMerge(startHintParams);
  const startHint = getStartMergeHint(startHintParams);
  const flowStatus = resolveVideoMergeActionStatus({
    ...startHintParams,
    mergeStatus,
    jobMessage,
    jobProgress,
    jobTotal,
  });

  async function handleStartMerge() {
    const mixError = validateMixRowsForStart(
      mixRows,
      videos,
      probingDurations,
      mixValidation,
    );
    if (mixError) {
      toast.error(mixError);
      return;
    }
    await start({
      inputFolder,
      outputFolder,
      mixRows,
      exportSettings,
    });
  }

  return (
    <AppPage
      className="flex min-h-[calc(100vh-12rem)] flex-col gap-2"
      title="Ghép Video"
    >
      <VideoMergeFolderExportSection
        inputFolder={inputFolder}
        outputFolder={outputFolder}
        onInputFolderChange={setInputFolder}
        onOutputFolderChange={setOutputFolder}
        exportSettings={exportSettings}
        onExportSettingsChange={patchExportSettings}
        settingsDisabled={settingsLoading}
        canOpenOutputFolder={canOpenOutputFolder}
        canStartMerge={canStartMerge}
        startHint={startHint}
        flowStatus={flowStatus}
        isRunning={isRunning}
        onStart={handleStartMerge}
        onCancel={cancel}
      />

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-2">
        <WorkspacePanel
          title="Video trong thư mục"
          badge={videoCountLabel}
          className="col-span-12 lg:col-span-5"
          contentClassName="overflow-hidden"
          headerAction={
            <AppToneButton
              icon={RefreshCw}
              tone="teal"
              size="sm"
              showIconBox={false}
              className={cn("h-8 shrink-0 text-xs", loading && "[&_svg]:animate-spin")}
              disabled={!hasInputFolder || loading}
              onClick={refresh}
              title="Tải lại danh sách video trong thư mục đầu vào"
            >
              Refresh video
            </AppToneButton>
          }
        >
          <VideoFilesTable
            videos={videos}
            loading={loading}
            probingDurations={probingDurations}
            folderPath={inputFolder}
          />
        </WorkspacePanel>

        <WorkspacePanel
          title="Mix Video"
          badge={mixRows.length > 0 ? String(mixRows.length) : undefined}
          className="col-span-12 lg:col-span-7"
          headerAction={
            <AppToneButton
              icon={Trash2}
              tone="rose"
              size="sm"
              showIconBox={false}
              className="h-8 shrink-0 text-xs"
              disabled={
                !hasInputFolder || settingsLoading || isRunning || mixRows.length === 0
              }
              title="Xóa toàn bộ dòng mix"
              onClick={clearAllMixRows}
            >
              Xóa tất cả
            </AppToneButton>
          }
        >
          <MixVideoPanel
            isRunning={isRunning}
            hasInputFolder={hasInputFolder}
            videos={videos}
            probingDurations={probingDurations}
            rows={mixRows}
            rowJobStates={rowJobStates}
            mixValidation={mixValidation}
            onAddRow={addMixRow}
            onRemoveRow={removeMixRow}
            onToggleLeading={toggleMixRowLeadingVideo}
          />
          {mixRowsError && hasInputFolder && !loading && !probingDurations ? (
            <p className="border-t px-4 py-2 text-xs text-amber-400/90">{mixRowsError}</p>
          ) : null}
        </WorkspacePanel>
      </div>
    </AppPage>
  );
}
