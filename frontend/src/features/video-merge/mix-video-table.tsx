import { Eye, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  formatDuration,
  formatExportDuration,
  formatExportSpeed,
} from "@/features/video-merge/format-duration";
import { MixStatusDetailButton } from "@/features/video-merge/mix-status-detail-button";
import {
  getMixRowDisplayStyle,
  resolveMixRowDisplay,
} from "@/features/video-merge/mix-row-job-status";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import {
  sumLeadingDuration,
  type MixValidationContext,
} from "@/features/video-merge/mix-row-utils";
import {
  canPreviewMixRow,
  resolveMixPreviewPath,
} from "@/features/video-merge/mix-output-path";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import type {
  VideoFileItem,
  VideoMergeJobOutput,
  VideoMergeRowJobState,
} from "@/lib/pywebview/types";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import { cn } from "@/lib/utils";

type MixVideoTableProps = {
  rows: MixRow[];
  videos: VideoFileItem[];
  probingDurations: boolean;
  disabled?: boolean;
  jobActive?: boolean;
  outputFolder?: string;
  exportFormat?: string;
  jobOutputs?: VideoMergeJobOutput[];
  rowJobStates?: Record<string, VideoMergeRowJobState>;
  mixValidation?: MixValidationContext;
  selectedRowId?: string | null;
  onSelectRow?: (rowId: string) => void;
  onRemoveRow: (rowId: string) => void;
};

function MixRowStatusCell({
  row,
  rowIndex,
  rows,
  videos,
  jobActive,
  rowJobStates,
  mixValidation,
}: {
  row: MixRow;
  rowIndex: number;
  rows: MixRow[];
  videos: VideoFileItem[];
  jobActive: boolean;
  rowJobStates?: Record<string, VideoMergeRowJobState>;
  mixValidation?: MixValidationContext;
}) {
  const display = resolveMixRowDisplay(
    row,
    rowIndex,
    videos,
    rowJobStates?.[row.id],
    jobActive,
    mixValidation,
    rows,
  );
  const style = getMixRowDisplayStyle(display);
  const detailMessage = display.errorMessage?.trim();

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <span
        className={cn(
          "inline-flex max-w-[9rem] min-w-0 truncate rounded-full px-2 py-0.5 text-xs font-medium",
          display.pulse && "animate-pulse",
        )}
        style={{ backgroundColor: style.bg, color: style.fg }}
      >
        {display.label}
      </span>
      {display.showErrorInfo && detailMessage ? (
        <MixStatusDetailButton
          message={detailMessage}
          variant={
            display.key === "merge_error"
              ? "error"
              : display.key === "running" || display.key === "done"
                ? "info"
                : "warning"
          }
        />
      ) : null}
    </div>
  );
}

const EXPORT_DURATION_MSG_RE = /Thời lượng xuất \(FFmpeg\):\s*([\d.]+)\s*s/i;
const EXPORT_SPEED_MSG_RE = /speed\s+([\d.]+)x/i;

function outputDurationForRow(
  rowId: string,
  jobOutputs: VideoMergeJobOutput[],
  rowJobStates?: Record<string, VideoMergeRowJobState>,
): number | null | undefined {
  const stateDur = rowJobStates?.[rowId]?.output_duration_sec;
  if (typeof stateDur === "number" && Number.isFinite(stateDur) && stateDur > 0) {
    return stateDur;
  }
  const preview = jobOutputs.find((item) => item.row_id === rowId);
  const previewDur = preview?.output_duration_sec;
  if (typeof previewDur === "number" && Number.isFinite(previewDur) && previewDur > 0) {
    return previewDur;
  }
  const hit = jobOutputs.find((item) => item.row_id === rowId && item.ok);
  const raw = hit?.output_duration_sec;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  const msg = rowJobStates?.[rowId]?.message ?? "";
  const parsed = EXPORT_DURATION_MSG_RE.exec(msg);
  if (parsed) {
    const value = Number.parseFloat(parsed[1]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

function outputSpeedForRow(
  rowId: string,
  jobOutputs: VideoMergeJobOutput[],
  rowJobStates?: Record<string, VideoMergeRowJobState>,
): number | null | undefined {
  const stateSpeed = rowJobStates?.[rowId]?.output_speed_x;
  if (typeof stateSpeed === "number" && Number.isFinite(stateSpeed) && stateSpeed > 0) {
    return stateSpeed;
  }
  const preview = jobOutputs.find((item) => item.row_id === rowId);
  const previewSpeed = preview?.output_speed_x;
  if (typeof previewSpeed === "number" && Number.isFinite(previewSpeed) && previewSpeed > 0) {
    return previewSpeed;
  }
  const hit = jobOutputs.find((item) => item.row_id === rowId && item.ok);
  const raw = hit?.output_speed_x;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw;
  }
  const msg = rowJobStates?.[rowId]?.message ?? "";
  const parsed = EXPORT_SPEED_MSG_RE.exec(msg);
  if (parsed) {
    const value = Number.parseFloat(parsed[1]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return undefined;
}

function formatLeadingFileNames(row: MixRow, videos: VideoFileItem[]): string {
  if (row.leadingPaths.length === 0) {
    return "—";
  }
  const names = row.leadingPaths.map((path) => {
    const item = videos.find((v) => v.path === path);
    return item?.name ?? path.split(/[/\\]/).pop() ?? path;
  });
  return names.join(", ");
}

export function MixVideoTable({
  rows,
  videos,
  probingDurations: _probingDurations,
  disabled,
  jobActive = false,
  outputFolder = "",
  exportFormat = "mp4",
  jobOutputs = [],
  rowJobStates,
  mixValidation,
  selectedRowId,
  onSelectRow,
  onRemoveRow,
}: MixVideoTableProps) {
  const { colors, typography } = APP_DARK_THEME;
  const actionsLocked = disabled || jobActive;

  function handleDeleteRow(row: MixRow, rowIndex: number) {
    const mixLabel = `Mix #${rowIndex + 1}`;
    const hasContent =
      row.leadingPaths.length > 0 ||
      canPreviewMixRow(row.id, jobOutputs, rowJobStates);
    if (hasContent) {
      const confirmed = window.confirm(
        `Xóa ${mixLabel}? Video trong mix sẽ bị gỡ khỏi danh sách (file đầu ra trên đĩa không bị xóa).`,
      );
      if (!confirmed) {
        return;
      }
    }
    onRemoveRow(row.id);
    toast.success(`Đã xóa ${mixLabel}.`);
  }

  async function handlePreviewRow(row: MixRow) {
    if (!outputFolder.trim()) {
      toast.error("Chọn thư mục đầu ra để xem video đã ghép.");
      return;
    }
    if (!canPreviewMixRow(row.id, jobOutputs, rowJobStates)) {
      toast.error("Chưa có file đầu ra. Bấm Bắt đầu để ghép video trước.");
      return;
    }
    const previewPath = resolveMixPreviewPath(
      row.id,
      outputFolder,
      exportFormat,
      jobOutputs,
    );
    if (!previewPath) {
      toast.error("Không xác định được đường dẫn file đầu ra.");
      return;
    }
    try {
      const client = await createBridgeClient();
      const result = await client.openMediaFile(previewPath);
      if (!result.ok) {
        toast.error(
          result.message ||
            "Không mở được file đầu ra. Kiểm tra thư mục đầu ra hoặc ghép lại mix.",
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không mở được video đầu ra.";
      toast.error(message);
    }
  }

  if (videos.length === 0 && rows.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm" style={{ color: colors.muted }}>
        Chọn video bên trái và bấm &quot;Tạo mix mới&quot; hoặc &quot;Thêm vào mix đang chọn&quot; để
        bắt đầu.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-8" />
            <col className="w-[5.5rem]" />
            <col className="w-[4.75rem]" />
            <col />
            <col className="w-[5.5rem]" />
            <col className="w-[4.5rem]" />
            <col className="w-[5.5rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-[7rem]" />
          </colgroup>
          <thead>
            <tr
              className="sticky top-0 z-10 border-b uppercase tracking-wider backdrop-blur-sm"
              style={{
                borderColor: colors.border,
                color: colors.muted,
                fontSize: typography.sectionLabel,
                backgroundColor: colors.surface,
              }}
            >
              <th className="w-8 px-2 py-2 font-semibold">#</th>
              <th className="min-w-[5.5rem] px-2 py-2 font-semibold">Tên mix</th>
              <th className="w-20 px-2 py-2 font-semibold">Số video</th>
              <th className="min-w-[10rem] px-2 py-2 font-semibold">Tập tin (đầu tiên)</th>
              <th className="w-24 px-2 py-2 font-semibold">Tổng (đầu)</th>
              <th className="w-24 px-2 py-2 font-semibold">Xuất</th>
              <th className="w-16 px-2 py-2 font-semibold">Speed</th>
              <th className="px-2 py-2 font-semibold">Trạng thái</th>
              <th className="w-28 px-2 py-2 text-center font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const leadingTotal = sumLeadingDuration(row, videos);
              const exportDuration = outputDurationForRow(
                row.id,
                jobOutputs,
                rowJobStates,
              );
              const exportSpeed = outputSpeedForRow(
                row.id,
                jobOutputs,
                rowJobStates,
              );
              const canPreview =
                outputFolder.trim().length > 0 &&
                canPreviewMixRow(row.id, jobOutputs, rowJobStates);
              const previewTitle = canPreview
                ? jobActive
                  ? "Mở video đã ghép xong (mix này)"
                  : "Mở file video đầu ra (ứng dụng mặc định)"
                : outputFolder.trim()
                  ? jobActive
                    ? "Chờ mix này ghép xong để xem"
                    : "Ghép video trước để xem đầu ra"
                  : "Chọn thư mục đầu ra trước";
              const isSelected = selectedRowId === row.id;

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "cursor-pointer border-b align-middle transition-colors hover:bg-white/[0.03]",
                    isSelected && "bg-violet-500/10",
                  )}
                  style={{ borderColor: colors.border }}
                  onClick={() => onSelectRow?.(row.id)}
                >
                  <td className="px-2 py-2" style={{ color: colors.muted }}>
                    <GripVertical className="size-4 opacity-50" aria-hidden />
                  </td>
                  <td
                    className="px-2 py-2 font-medium whitespace-nowrap"
                    style={{ color: colors.foreground }}
                  >
                    Mix #{index + 1}
                  </td>
                  <td
                    className="px-2 py-2 tabular-nums whitespace-nowrap"
                    style={{ color: colors.muted }}
                  >
                    {row.leadingPaths.length} video
                  </td>
                  <td
                    className="max-w-[14rem] truncate px-2 py-2 text-xs"
                    style={{ color: colors.muted }}
                    title={formatLeadingFileNames(row, videos)}
                  >
                    {formatLeadingFileNames(row, videos)}
                  </td>
                  <td
                    className="px-2 py-2 tabular-nums text-xs whitespace-nowrap"
                    style={{ color: colors.foreground }}
                  >
                    {leadingTotal != null ? formatDuration(leadingTotal) : "—"}
                  </td>
                  <td
                    className="px-2 py-2 tabular-nums text-xs whitespace-nowrap"
                    style={{ color: colors.accent }}
                    title="Thời lượng file xuất (từ log FFmpeg render)"
                  >
                    {formatExportDuration(exportDuration)}
                  </td>
                  <td
                    className="px-2 py-2 tabular-nums text-xs whitespace-nowrap"
                    style={{ color: colors.muted }}
                    title="Tốc độ encode FFmpeg (speed=…x từ log render)"
                  >
                    {formatExportSpeed(exportSpeed)}
                  </td>
                  <td className="overflow-hidden px-2 py-2">
                    <MixRowStatusCell
                      row={row}
                      rowIndex={index}
                      rows={rows}
                      videos={videos}
                      jobActive={jobActive}
                      rowJobStates={rowJobStates}
                      mixValidation={mixValidation}
                    />
                  </td>
                  <td className="px-1 py-2">
                    <div
                      className="flex items-center justify-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="rounded p-1.5 text-white/55 hover:bg-white/10 hover:text-[var(--app-accent)] disabled:opacity-35"
                        disabled={disabled || !canPreview}
                        title={previewTitle}
                        aria-label={previewTitle}
                        onClick={() => void handlePreviewRow(row)}
                      >
                        <Eye className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-rose-400 disabled:opacity-40"
                        disabled={actionsLocked}
                        title="Xóa mix khỏi danh sách"
                        aria-label={`Xóa Mix #${index + 1}`}
                        onClick={() => handleDeleteRow(row, index)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm" style={{ color: colors.muted }}>
            Chưa có mix. Chọn video bên trái và bấm &quot;Tạo mix mới&quot; để bắt đầu.
          </p>
        ) : null}
      </div>
    </div>
  );
}
