import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListX, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppToneButton } from "@/components/common/app-tone-button";
import { AppPage, WorkspacePanel } from "@/components/layout";
import { VideoMergeConfigCards } from "@/features/video-merge/video-merge-config-cards";
import { VideoMergePageHeader } from "@/features/video-merge/video-merge-page-header";
import { VideoMergeToolbar } from "@/features/video-merge/video-merge-toolbar";
import { VideoFolderListPanel } from "@/features/video-merge/video-folder-list-panel";
import { usePersistedVideoMergeState } from "@/features/video-merge/use-persisted-video-merge-state";
import { useVideoList } from "@/features/video-merge/use-video-list";
import { useVideoMergeJob } from "@/features/video-merge/use-video-merge-job";
import {
  getCanOpenOutputFolder,
  getCanStartMerge,
  getStartMergeHint,
  resolveVideoMergeActionStatus,
} from "@/features/video-merge/get-start-merge-hint";
import { canShowMixVideoTable } from "@/features/video-merge/merge-folder-validation";
import { MAX_LEADING_VIDEOS_PER_ROW } from "@/features/video-merge/mix-row-types";
import {
  setLeadingVideosForRow,
  buildMixValidationContext,
  validateMixRowsForStart,
} from "@/features/video-merge/mix-row-utils";
import { canPreviewMixRow } from "@/features/video-merge/mix-output-path";
import { reconcileMixRowsWithVideos } from "@/features/video-merge/video-path-utils";
import { MixVideoPanel } from "@/features/video-merge/mix-video-panel";
import { resolveSelectedMixRowId } from "@/features/video-merge/mix-workspace-persist";
import { useMergeFolderValidation } from "@/features/video-merge/use-merge-folder-validation";
import { MixStatusDetailButton } from "@/features/video-merge/mix-status-detail-button";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { cn } from "@/lib/utils";
import { APP_SCOPES, hasScope } from "@/lib/auth/scopes";
import { useAuthStore } from "@/stores/auth-store";

export function VideoMergePage() {
  const user = useAuthStore((state) => state.user);
  const canWrite = hasScope(user, APP_SCOPES.VIDEO_EDITOR_WRITE);
  const {
    hydrated,
    settingsLoading,
    inputFolder,
    outputFolder,
    exportSettings,
    mixRows,
    selectedMixRowId,
    setInputFolder,
    setOutputFolder,
    patchExportSettings,
    setSelectedMixRowId,
    addMixRow,
    removeMixRow,
    clearAllMixRows,
    replaceMixRows,
    updateMixRows,
  } = usePersistedVideoMergeState();
  const { videos, loading, probingDurations, refresh } = useVideoList(
    hydrated ? inputFolder : "",
  );
  const {
    isRunning,
    isCancelling,
    status: mergeStatus,
    jobMessage,
    jobProgress,
    jobTotal,
    rowJobStates,
    jobOutputs,
    start,
    cancel,
    resetMixJobDisplay,
    refreshingJobStatus,
  } = useVideoMergeJob();

  const [selectedVideoPaths, setSelectedVideoPaths] = useState<Set<string>>(() => new Set());
  const didSyncCheckboxesFromRestoreRef = useRef(false);

  const folderValidation = useMergeFolderValidation(
    inputFolder,
    outputFolder,
    hydrated && !settingsLoading,
  );
  const hasInputFolder = canShowMixVideoTable(
    inputFolder,
    videos.length,
    folderValidation,
  );
  const formDisabled = settingsLoading || isRunning || !canWrite;

  const videoCountLabel = useMemo(() => {
    if (!inputFolder.trim() || loading) {
      return undefined;
    }
    return `${videos.length} video`;
  }, [inputFolder, loading, videos.length]);

  const mixCountLabel = useMemo(() => {
    if (mixRows.length === 0) {
      return undefined;
    }
    return `${mixRows.length} mix`;
  }, [mixRows.length]);

  const selectedVideoCountLabel = useMemo(() => {
    if (!inputFolder.trim() || loading) {
      return undefined;
    }
    return `${selectedVideoPaths.size} đã chọn`;
  }, [inputFolder, loading, selectedVideoPaths.size]);

  useEffect(() => {
    if (!hydrated || loading || probingDurations || videos.length === 0 || mixRows.length === 0) {
      return;
    }
    const reconciled = reconcileMixRowsWithVideos(mixRows, videos);
    if (reconciled.changed) {
      replaceMixRows(reconciled.rows);
    }
  }, [hydrated, loading, probingDurations, videos, mixRows, replaceMixRows]);

  useEffect(() => {
    if (!hydrated) {
      didSyncCheckboxesFromRestoreRef.current = false;
      return;
    }
    if (
      !didSyncCheckboxesFromRestoreRef.current &&
      mixRows.length > 0 &&
      selectedMixRowId
    ) {
      const row = mixRows.find((item) => item.id === selectedMixRowId);
      if (row) {
        setSelectedVideoPaths(new Set(row.leadingPaths));
        didSyncCheckboxesFromRestoreRef.current = true;
      }
    }
  }, [hydrated, mixRows, selectedMixRowId]);

  useEffect(() => {
    if (mixRows.length === 0) {
      setSelectedMixRowId(null);
      setSelectedVideoPaths(new Set());
      return;
    }
    if (!selectedMixRowId || !mixRows.some((row) => row.id === selectedMixRowId)) {
      const firstRow = mixRows[0];
      setSelectedMixRowId(firstRow.id);
      setSelectedVideoPaths(new Set(firstRow.leadingPaths));
    }
  }, [mixRows, selectedMixRowId, setSelectedMixRowId]);

  const handleSelectMixRow = useCallback(
    (rowId: string) => {
      setSelectedMixRowId(rowId);
      const row = mixRows.find((item) => item.id === rowId);
      setSelectedVideoPaths(new Set(row?.leadingPaths ?? []));
    },
    [mixRows, setSelectedMixRowId],
  );

  const syncedChaptimeSignatureRef = useRef("");

  useEffect(() => {
    if (mergeStatus !== "done") {
      if (mergeStatus === "idle" || mergeStatus === "running") {
        syncedChaptimeSignatureRef.current = "";
      }
      return;
    }
    const parts: string[] = [];
    for (const row of mixRows) {
      const chaptime = rowJobStates[row.id]?.chaptime?.trim();
      if (chaptime) {
        parts.push(`${row.id}:${chaptime}`);
      }
    }
    if (parts.length === 0) {
      return;
    }
    const signature = parts.join("|");
    if (signature === syncedChaptimeSignatureRef.current) {
      return;
    }
    syncedChaptimeSignatureRef.current = signature;
    updateMixRows((rows) =>
      rows.map((row) => {
        const chaptime = rowJobStates[row.id]?.chaptime?.trim();
        if (!chaptime || row.chaptime === chaptime) {
          return row;
        }
        return { ...row, chaptime };
      }),
    );
  }, [mergeStatus, mixRows, rowJobStates, updateMixRows]);

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
    folderValidation,
    videos,
    loading,
    probingDurations,
    mixRows,
    isRunning,
    durationMinSec: exportSettings.durationMinSec,
    durationMaxSec: exportSettings.durationMaxSec,
  };

  const canOpenOutputFolder = getCanOpenOutputFolder(
    outputFolder,
    settingsLoading,
    folderValidation,
  );
  const canStartMerge = canWrite && getCanStartMerge(startHintParams);
  const startHint = getStartMergeHint(startHintParams);
  const flowStatus = resolveVideoMergeActionStatus({
    ...startHintParams,
    mergeStatus,
    jobMessage,
    jobProgress,
    jobTotal,
  });

  const toggleVideoSelection = useCallback((path: string) => {
    setSelectedVideoPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const clearVideoSelection = useCallback(() => {
    setSelectedVideoPaths(new Set());
  }, []);

  const handleAddToSelectedMix = useCallback(() => {
    if (!selectedMixRowId) {
      toast.error("Chọn một mix ở bảng bên phải.");
      return;
    }
    const paths = videos
      .filter((video) => selectedVideoPaths.has(video.path))
      .map((video) => video.path);
    updateMixRows((rows) => {
      const result = setLeadingVideosForRow(rows, selectedMixRowId, paths);
      if (!result.ok) {
        toast.error(result.error);
        return rows;
      }
      const updatedRow = result.rows.find((row) => row.id === selectedMixRowId);
      setSelectedVideoPaths(new Set(updatedRow?.leadingPaths ?? []));
      toast.success(
        paths.length === 0 ? "Đã xóa video khỏi mix." : "Đã cập nhật video trong mix.",
      );
      return result.rows;
    });
  }, [selectedMixRowId, selectedVideoPaths, updateMixRows, videos]);

  const handleCreateMix = useCallback(() => {
    const paths = videos
      .filter((video) => selectedVideoPaths.has(video.path))
      .map((video) => video.path);

    if (paths.length === 0) {
      toast.error("Chọn ít nhất một video để tạo mix mới.");
      return;
    }

    if (paths.length > MAX_LEADING_VIDEOS_PER_ROW) {
      toast.error(`Chọn tối đa ${MAX_LEADING_VIDEOS_PER_ROW} video cho mỗi mix.`);
      return;
    }

    const mixNumber = mixRows.length + 1;
    addMixRow(paths);
    setSelectedVideoPaths(new Set(paths));
    toast.success(`Đã tạo Mix #${mixNumber} với ${paths.length} video.`);
  }, [addMixRow, mixRows.length, selectedVideoPaths, videos]);

  const handleRemoveMixRow = useCallback(
    (rowId: string) => {
      const nextRows = mixRows.filter((row) => row.id !== rowId);
      const nextSelectedId =
        selectedMixRowId === rowId
          ? resolveSelectedMixRowId(nextRows, null)
          : resolveSelectedMixRowId(nextRows, selectedMixRowId);
      removeMixRow(rowId);
      if (selectedMixRowId === rowId) {
        const nextRow = nextRows.find((row) => row.id === nextSelectedId);
        setSelectedVideoPaths(new Set(nextRow?.leadingPaths ?? []));
      }
    },
    [mixRows, removeMixRow, selectedMixRowId],
  );

  const handleClearAllMixRows = useCallback(() => {
    if (mixRows.length === 0) {
      return;
    }
    const hasContent = mixRows.some(
      (row) =>
        row.leadingPaths.length > 0 ||
        canPreviewMixRow(row.id, jobOutputs, rowJobStates),
    );
    if (hasContent) {
      const confirmed = window.confirm(
        `Xóa tất cả ${mixRows.length} mix? Video trong các mix sẽ bị gỡ khỏi danh sách (file đầu ra trên đĩa không bị xóa).`,
      );
      if (!confirmed) {
        return;
      }
    }
    clearAllMixRows();
    setSelectedVideoPaths(new Set());
    toast.success("Đã xóa tất cả mix.");
  }, [mixRows, clearAllMixRows, jobOutputs, rowJobStates]);

  async function handleStartMerge() {
    const reconciled = reconcileMixRowsWithVideos(mixRows, videos);
    const rowsForStart = reconciled.changed ? reconciled.rows : mixRows;
    if (reconciled.changed) {
      replaceMixRows(reconciled.rows);
      if (reconciled.message) {
        toast.message(reconciled.message);
      }
    }

    const mixError = validateMixRowsForStart(
      rowsForStart,
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
      mixRows: rowsForStart,
      exportSettings,
      folderVideos: videos,
    });
  }

  const { colors, radius } = APP_DARK_THEME;

  return (
    <AppPage className="flex min-h-[calc(100vh-12rem)] flex-col gap-3">
      <VideoMergePageHeader flowStatus={flowStatus} />

      <section
        className="shrink-0 rounded-[var(--app-radius-card,1.125rem)] border p-3"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.card,
        }}
      >
        <VideoMergeConfigCards
          inputFolder={inputFolder}
          outputFolder={outputFolder}
          onInputFolderChange={setInputFolder}
          onOutputFolderChange={setOutputFolder}
          exportSettings={exportSettings}
          onExportSettingsChange={patchExportSettings}
          disabled={formDisabled}
        />
      </section>

      <VideoMergeToolbar
        outputFolder={outputFolder}
        canOpenOutputFolder={canOpenOutputFolder}
        canStartMerge={canStartMerge}
        startHint={startHint}
        isRunning={isRunning}
        isCancelling={isCancelling}
        loadingVideos={loading}
        hasInputFolder={hasInputFolder}
        onRefreshVideos={refresh}
        onStart={handleStartMerge}
        onCancel={cancel}
      />

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-2">
        <WorkspacePanel
          title="Video trong thư mục"
          badge={videoCountLabel}
          className="col-span-12 lg:col-span-4"
          contentClassName="flex min-h-0 flex-col overflow-hidden p-0"
          headerAction={
            <div className="flex shrink-0 items-center gap-2">
              {selectedVideoCountLabel ? (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
                  style={{
                    backgroundColor: "rgba(59, 130, 246, 0.15)",
                    color: "#3b82f6",
                  }}
                >
                  {selectedVideoCountLabel}
                </span>
              ) : null}
              <AppToneButton
                icon={ListX}
                tone="blue"
                size="sm"
                showIconBox={false}
                className="h-8 shrink-0 text-xs"
                disabled={
                  formDisabled ||
                  !hasInputFolder ||
                  loading ||
                  selectedVideoPaths.size === 0
                }
                title="Bỏ chọn tất cả video trong danh sách"
                onClick={clearVideoSelection}
              >
                Bỏ chọn tất cả
              </AppToneButton>
            </div>
          }
        >
          <VideoFolderListPanel
            videos={videos}
            mixRows={mixRows}
            loading={loading}
            probingDurations={probingDurations}
            folderPath={inputFolder}
            disabled={formDisabled}
            selectedPaths={selectedVideoPaths}
            selectedMixRowId={selectedMixRowId}
            onToggleSelect={toggleVideoSelection}
            onAddToSelectedMix={handleAddToSelectedMix}
            onCreateMix={handleCreateMix}
          />
        </WorkspacePanel>

        <WorkspacePanel
          title="Mix Video"
          badge={mixCountLabel}
          className="col-span-12 lg:col-span-8"
          contentClassName="overflow-hidden p-0"
          headerAction={
            hasInputFolder ? (
              <div className="flex shrink-0 items-center gap-2">
                <AppToneButton
                  icon={RefreshCw}
                  tone="teal"
                  size="sm"
                  showIconBox={false}
                  className={cn(
                    "h-8 shrink-0 text-xs",
                    refreshingJobStatus && "[&_svg]:animate-spin",
                  )}
                  disabled={formDisabled || refreshingJobStatus}
                  title="Làm mới cột trạng thái, xuất và speed trên bảng mix"
                  onClick={() => void resetMixJobDisplay()}
                >
                  Refresh
                </AppToneButton>
                <AppToneButton
                  icon={Trash2}
                  tone="rose"
                  size="sm"
                  showIconBox={false}
                  className="h-8 shrink-0 text-xs"
                  disabled={formDisabled || mixRows.length === 0}
                  onClick={handleClearAllMixRows}
                >
                  Xóa tất cả
                </AppToneButton>
              </div>
            ) : null
          }
        >
          <MixVideoPanel
            isRunning={isRunning}
            hasInputFolder={hasInputFolder}
            outputFolder={outputFolder}
            exportFormat={exportSettings.format}
            jobOutputs={jobOutputs}
            videos={videos}
            probingDurations={probingDurations}
            rows={mixRows}
            rowJobStates={rowJobStates}
            mixValidation={mixValidation}
            selectedRowId={selectedMixRowId}
            onSelectRow={handleSelectMixRow}
            onRemoveRow={handleRemoveMixRow}
          />
          {mixRowsError && hasInputFolder && !loading && !probingDurations ? (
            <div className="flex items-center gap-1.5 border-t px-4 py-2 text-xs text-amber-400/90">
              <span className="shrink-0 font-medium">Chưa hợp lệ</span>
              <MixStatusDetailButton message={mixRowsError} variant="warning" />
            </div>
          ) : null}
        </WorkspacePanel>
      </div>
    </AppPage>
  );
}
