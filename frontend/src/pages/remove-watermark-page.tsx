import { useMemo } from "react";
import { Eraser, Eye } from "lucide-react";

import { AppToneButton } from "@/components/common/app-tone-button";
import { AppPage, WorkspacePanel } from "@/components/layout";
import {
  getRemoveWatermarkLoadHint,
  getRemoveWatermarkStartHint,
} from "@/features/remove-watermark/remove-watermark-folder-validation";
import { RemoveWatermarkConfigSection } from "@/features/remove-watermark/remove-watermark-config-section";
import { RemoveWatermarkToolbar } from "@/features/remove-watermark/remove-watermark-toolbar";
import { useRemoveWatermarkState } from "@/features/remove-watermark/use-remove-watermark-state";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { APP_SCOPES, hasScope } from "@/lib/auth/scopes";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

function formatStatusLabel(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (!normalized || normalized === "pending") return "Chờ";
  if (normalized === "processing" || normalized === "running") return "Đang xử lý";
  if (normalized === "completed" || normalized === "success" || normalized === "done") {
    return "Hoàn tất";
  }
  if (normalized === "failed" || normalized === "error" || normalized.startsWith("failed")) {
    return "Lỗi";
  }
  if (normalized === "cancelled" || normalized === "canceled") return "Đã hủy";
  return status.trim();
}

function statusClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "processing" || normalized === "running") {
    return "bg-amber-500/15 text-amber-300";
  }
  if (normalized === "completed" || normalized === "success" || normalized === "done") {
    return "bg-emerald-500/15 text-emerald-300";
  }
  if (
    normalized === "failed" ||
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "error"
  ) {
    return "bg-rose-500/15 text-rose-300";
  }
  return "bg-sky-500/15 text-sky-300";
}

export function RemoveWatermarkPage() {
  const { colors, radius } = APP_DARK_THEME;
  const user = useAuthStore((state) => state.user);
  const canWrite = hasScope(user, APP_SCOPES.REMOVE_WATERMARK_WRITE);
  const {
    inputFolder,
    outputFolder,
    threadCount,
    rows,
    loadingRows,
    busy,
    stopRequested,
    canStart,
    settingsLoading,
    eligibleRowCount,
    setInputFolder,
    setOutputFolder,
    setThreadCount,
    loadVideos,
    startBatch,
    stopBatch,
    openOutputDir,
    previewRow,
  } = useRemoveWatermarkState();

  const formDisabled = settingsLoading || busy || !canWrite;
  const hasInputFolder = inputFolder.trim().length > 0;
  const canOpenOutputFolder = outputFolder.trim().length > 0;
  const loadHint = getRemoveWatermarkLoadHint(
    inputFolder,
    outputFolder,
    loadingRows,
    busy,
  );
  const startHint = getRemoveWatermarkStartHint({
    settingsLoading,
    inputFolder,
    outputFolder,
    eligibleCount: eligibleRowCount,
    busy,
  });

  const videoCountLabel = useMemo(() => {
    if (!hasInputFolder || loadingRows) {
      return undefined;
    }
    return `${rows.length} video`;
  }, [hasInputFolder, loadingRows, rows.length]);

  return (
    <AppPage
      className="flex min-h-[calc(100vh-12rem)] flex-col gap-3"
      title="Xóa watermark"
      icon={Eraser}
      subtitle="Xóa logo/watermark VEO bằng công cụ ffmpeg (Gemini Watermark Tool)."
    >
      <section
        className="shrink-0 rounded-[var(--app-radius-card,1.125rem)] border p-3"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.card,
        }}
      >
        <RemoveWatermarkConfigSection
          inputFolder={inputFolder}
          outputFolder={outputFolder}
          threadCount={threadCount}
          onInputFolderChange={(value, options) => {
            setInputFolder(value);
            if (options?.immediate && value.trim()) {
              void loadVideos(value);
            }
          }}
          onOutputFolderChange={setOutputFolder}
          onThreadCountChange={setThreadCount}
          disabled={formDisabled}
        />
      </section>

      <RemoveWatermarkToolbar
        canOpenOutputFolder={canOpenOutputFolder}
        canStart={canStart && canWrite}
        loadHint={loadHint}
        startHint={startHint}
        loadingRows={loadingRows}
        busy={busy}
        stopRequested={stopRequested}
        onLoadVideos={() => void loadVideos(inputFolder)}
        onOpenOutputDir={() => void openOutputDir()}
        onStartBatch={() => void startBatch()}
        onStopBatch={() => void stopBatch()}
      />

      <WorkspacePanel
        title="Danh sách video"
        badge={videoCountLabel}
        className="min-h-0 flex-1"
        contentClassName="flex min-h-0 flex-col overflow-hidden p-0"
      >
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--app-surface)] text-xs uppercase tracking-wide text-[var(--app-muted)] shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Tiến độ</th>
                <th className="px-3 py-2">Đầu ra</th>
                <th className="px-3 py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-[var(--app-muted)]">
                    Chọn thư mục đầu vào, thư mục đầu ra và bấm Tải danh sách.
                  </td>
                </tr>
              ) : null}
              {rows.map((row, index) => (
                <tr key={row.inputPath} className="border-t border-white/6">
                  <td className="px-3 py-2 align-top tabular-nums">{index + 1}</td>
                  <td className="px-3 py-2 align-top">{row.fileName}</td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        statusClass(row.status),
                      )}
                    >
                      {formatStatusLabel(row.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top tabular-nums">{row.progressPct}%</td>
                  <td className="px-3 py-2 align-top">
                    <span className="block max-w-[280px] truncate" title={row.outputPath}>
                      {row.outputPath}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <AppToneButton
                      icon={Eye}
                      tone="blue"
                      size="sm"
                      showIconBox={false}
                      className="h-8 text-xs"
                      onClick={() => void previewRow(row)}
                    >
                      Xem
                    </AppToneButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WorkspacePanel>
    </AppPage>
  );
}
