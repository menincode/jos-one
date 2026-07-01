
import {
  FolderOpen,
  Play,
  Repeat,
  Square,
  ExternalLink,
  RotateCcw,
  Loader2,
  Eye,
} from "lucide-react";

import { AppToneButton } from "@/components/common/app-tone-button";
import { AppPage, WorkspacePanel } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { APP_SCOPES, hasScope } from "@/lib/auth/scopes";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { useVideoLoopJob } from "@/features/video-loop/use-video-loop-job";

/* ── helpers ── */
function statusColor(status: string) {
  switch (status) {
    case "running":
      return "text-amber-300";
    case "done":
      return "text-emerald-300";
    case "error":
      return "text-rose-300";
    case "cancelled":
      return "text-rose-300";
    default:
      return "text-[var(--app-muted)]";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "idle":
      return "Sẵn sàng";
    case "running":
      return "Đang xử lý";
    case "done":
      return "Hoàn tất";
    case "error":
      return "Lỗi";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
}

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ── page ── */
export function VideoLoopPage() {
  const { colors, radius, typography } = APP_DARK_THEME;
  const user = useAuthStore((s) => s.user);
  const canWrite = hasScope(user, APP_SCOPES.VIDEO_LOOP_WRITE);
  const {
    inputFolder,
    outputFolder,
    loopCount,
    settingsLoading,
    jobStatus,
    outputPath,
    totalFiles,
    doneFiles,
    busy,
    canStart,
    setInputFolder,
    setOutputFolder,
    setLoopCount,
    threadCount,
    setThreadCount,
    browseInputFolder,
    browseOutputFolder,
    startJob,
    cancelJob,
    openOutputDir,
    openOutputFile,
    openFile,
    resetJob,
    videoFiles,
    videosLoading,
    fileStatuses,
  } = useVideoLoopJob();

  const formDisabled = settingsLoading || busy || !canWrite;

  const isDone = jobStatus === "done";
  const isError = jobStatus === "error" || jobStatus === "cancelled";

  return (
    <AppPage
      className="flex min-h-[calc(100vh-12rem)] flex-col gap-4"
      title="Loop video"
      icon={Repeat}
    >
      {/* ── Config Card ── */}
      <section
        className="shrink-0 rounded-[var(--app-radius-card,1.125rem)] border p-4"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.card,
        }}
      >
        <div className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-4">
          {/* input folder */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="loop-input-folder"
              className="font-semibold uppercase tracking-wider"
              style={{ color: colors.muted, fontSize: typography.sectionLabel }}
            >
              Thư mục video đầu vào
            </label>
            <div className="flex min-w-0 gap-2">
              <Input
                id="loop-input-folder"
                type="text"
                value={inputFolder}
                onChange={(e) => setInputFolder(e.target.value)}
                placeholder="Chọn thư mục chứa video…"
                disabled={formDisabled}
                className="min-w-0 flex-1 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/35 focus-visible:ring-[var(--app-accent)]"
                spellCheck={false}
              />
              <AppToneButton
                icon={FolderOpen}
                tone="green"
                size="sm"
                showIconBox={false}
                className="shrink-0"
                disabled={formDisabled}
                onClick={() => void browseInputFolder()}
              >
                Duyệt
              </AppToneButton>
            </div>
          </div>

          {/* output folder */}
          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="loop-output-folder"
              className="font-semibold uppercase tracking-wider"
              style={{ color: colors.muted, fontSize: typography.sectionLabel }}
            >
              Thư mục đầu ra
            </label>
            <div className="flex min-w-0 gap-2">
              <Input
                id="loop-output-folder"
                type="text"
                value={outputFolder}
                onChange={(e) => setOutputFolder(e.target.value)}
                placeholder="Chọn thư mục lưu video…"
                disabled={formDisabled}
                className="min-w-0 flex-1 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/35 focus-visible:ring-[var(--app-accent)]"
                spellCheck={false}
              />
              <AppToneButton
                icon={FolderOpen}
                tone="blue"
                size="sm"
                showIconBox={false}
                className="shrink-0"
                disabled={formDisabled}
                onClick={() => void browseOutputFolder()}
              >
                Duyệt
              </AppToneButton>
            </div>
          </div>

          {/* loop count */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="loop-count"
              className="font-semibold uppercase tracking-wider"
              style={{ color: colors.muted, fontSize: typography.sectionLabel }}
            >
              Số lần lặp
            </label>
            <Input
              id="loop-count"
              type="number"
              min={2}
              max={100}
              value={loopCount}
              onChange={(e) => setLoopCount(Number(e.target.value))}
              disabled={formDisabled}
              className="w-24 border-white/10 bg-white/5 text-sm text-white tabular-nums placeholder:text-white/35 focus-visible:ring-[var(--app-accent)]"
            />
          </div>

          {/* thread count */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="loop-thread-count"
              className="font-semibold uppercase tracking-wider"
              style={{ color: colors.muted, fontSize: typography.sectionLabel }}
            >
              Luồng
            </label>
            <Input
              id="loop-thread-count"
              type="number"
              min={1}
              max={32}
              value={threadCount}
              onChange={(e) => setThreadCount(Number(e.target.value))}
              disabled={formDisabled}
              className="w-20 border-white/10 bg-white/5 text-sm text-white tabular-nums placeholder:text-white/35 focus-visible:ring-[var(--app-accent)]"
            />
          </div>
        </div>
      </section>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2">
        <AppToneButton
            icon={Play}
            tone="green"
            size="sm"
            disabled={!canStart || !canWrite || busy}
            onClick={() => void startJob()}
          >
            Bắt đầu Loop
          </AppToneButton>
          <AppToneButton
            icon={Square}
            tone="rose"
            size="sm"
            disabled={!busy}
            onClick={() => void cancelJob()}
          >
            Hủy
          </AppToneButton>

        {outputFolder.trim() && (
          <AppToneButton
            icon={FolderOpen}
            tone="blue"
            size="sm"
            showIconBox={false}
            onClick={() => void openOutputDir()}
          >
            Mở thư mục
          </AppToneButton>
        )}

        {isDone && outputPath && (
          <AppToneButton
            icon={ExternalLink}
            tone="teal"
            size="sm"
            showIconBox={false}
            onClick={() => void openOutputFile()}
          >
            Mở video cuối
          </AppToneButton>
        )}

        {isError && (
          <AppToneButton
            icon={RotateCcw}
            tone="amber"
            size="sm"
            showIconBox={false}
            onClick={resetJob}
          >
            Thử lại
          </AppToneButton>
        )}

        {/* status — pushed to the right */}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <span style={{ color: colors.muted }}>Trạng thái:</span>
          <span className={cn("font-medium", statusColor(jobStatus))}>
            {statusLabel(jobStatus)}
          </span>
          {totalFiles > 0 && (
            <span className="text-xs tabular-nums" style={{ color: colors.muted }}>
              ({doneFiles}/{totalFiles} video)
            </span>
          )}
        </div>
      </div>

      {/* ── Video Files Table ── */}
      <WorkspacePanel
        title="Danh sách video"
        badge={!videosLoading && videoFiles.length > 0 ? `${videoFiles.length} video` : undefined}
        className="min-h-0 flex-1"
        contentClassName="flex min-h-0 flex-col overflow-hidden p-0"
      >
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--app-surface)] text-xs uppercase tracking-wide text-[var(--app-muted)] shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2 text-right">Độ dài</th>
                <th className="px-3 py-2 text-right">Kích thước</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Tiến độ</th>
                <th className="px-3 py-2">Tốc độ</th>
                <th className="px-3 py-2">Đầu ra</th>
                <th className="px-3 py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {videosLoading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-[var(--app-muted)]">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Đang tải danh sách video…
                    </span>
                  </td>
                </tr>
              ) : videoFiles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-[var(--app-muted)]">
                    {inputFolder.trim()
                      ? "Không tìm thấy video nào trong thư mục."
                      : "Chọn thư mục đầu vào để xem danh sách video."}
                  </td>
                </tr>
              ) : null}
              {videoFiles.map((v, i) => {
                const normPath = (p: string) => p.replace(/\\/g, "/").toLowerCase();
                const fs = fileStatuses.find((f) => normPath(f.input_path) === normPath(v.path));
                const rowStatus = fs?.status ?? "pending";
                const rowPct = fs?.progress_pct ?? 0;
                const rowSpeed = fs?.speed_x ?? null;
                const rowOutput = fs?.output_path ?? "";
                return (
                  <tr key={v.path} className="border-t border-white/6">
                    <td className="px-3 py-2 align-top tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2 align-top" title={v.path}>{v.name}</td>
                    <td className="px-3 py-2 align-top text-right tabular-nums text-[var(--app-muted)]">
                      {formatDuration(v.duration_sec)}
                    </td>
                    <td className="px-3 py-2 align-top text-right tabular-nums text-[var(--app-muted)]">
                      {(v.size_bytes / 1_048_576).toFixed(1)} MB
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          rowStatus === "running" && "bg-amber-500/15 text-amber-300",
                          rowStatus === "done" && "bg-emerald-500/15 text-emerald-300",
                          (rowStatus === "error" || rowStatus === "cancelled") && "bg-rose-500/15 text-rose-300",
                          rowStatus === "pending" && "bg-sky-500/15 text-sky-300",
                        )}
                      >
                        {rowStatus === "pending" && "Chờ"}
                        {rowStatus === "running" && "Đang xử lý"}
                        {rowStatus === "done" && "Hoàn tất"}
                        {rowStatus === "error" && "Lỗi"}
                        {rowStatus === "cancelled" && "Đã hủy"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top tabular-nums">{rowPct}%</td>
                    <td className="px-3 py-2 align-top tabular-nums">
                      {rowStatus === "running" && rowSpeed != null ? (
                        <span className="text-amber-300">{rowSpeed.toFixed(0)}x</span>
                      ) : (
                        <span className="text-[var(--app-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {rowOutput ? (
                        <span
                          className="block max-w-[280px] truncate text-emerald-300"
                          title={rowOutput}
                        >
                          {rowOutput.replace(/\\/g, "/").split("/").pop()}
                        </span>
                      ) : (
                        <span className="text-[var(--app-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <AppToneButton
                        icon={Eye}
                        tone="blue"
                        size="sm"
                        showIconBox={false}
                        className="h-8 text-xs"
                        disabled={!rowOutput}
                        onClick={() => void openFile(rowOutput)}
                      >
                        Xem
                      </AppToneButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </WorkspacePanel>
    </AppPage>
  );
}
