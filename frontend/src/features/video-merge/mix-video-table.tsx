import { Eye, Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppToneButton } from "@/components/common/app-tone-button";
import { formatDuration } from "@/features/video-merge/format-duration";
import {
  getMixRowDisplayStyle,
  resolveMixRowDisplay,
} from "@/features/video-merge/mix-row-job-status";
import {
  MAX_LEADING_VIDEOS_PER_ROW,
  MIN_LEADING_VIDEOS_PER_ROW,
  type MixRow,
} from "@/features/video-merge/mix-row-types";
import {
  canToggleLeadingVideo,
  type MixValidationContext,
  pathsUsedInOtherRows,
  sumLeadingDuration,
} from "@/features/video-merge/mix-row-utils";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import type { VideoFileItem, VideoMergeRowJobState } from "@/lib/pywebview/types";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import { cn } from "@/lib/utils";

type MixVideoTableProps = {
  rows: MixRow[];
  videos: VideoFileItem[];
  probingDurations: boolean;
  disabled?: boolean;
  jobActive?: boolean;
  rowJobStates?: Record<string, VideoMergeRowJobState>;
  mixValidation?: MixValidationContext;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onToggleLeading: (rowId: string, path: string) => void;
};

function MixRowStatusCell({
  row,
  rowIndex,
  videos,
  jobActive,
  rowJobStates,
  mixValidation,
}: {
  row: MixRow;
  rowIndex: number;
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
  );
  const style = getMixRowDisplayStyle(display);

  function showErrorDetail() {
    const message = display.errorMessage?.trim() ?? display.label;
    toast.error(message, { duration: 12_000 });
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
          display.pulse && "animate-pulse",
        )}
        style={{ backgroundColor: style.bg, color: style.fg }}
      >
        {display.label}
      </span>
      {display.showErrorInfo ? (
        <button
          type="button"
          className="rounded p-0.5 text-rose-300/90 hover:bg-white/10 hover:text-rose-200"
          title="Xem chi tiết lỗi"
          aria-label="Xem chi tiết lỗi"
          onClick={showErrorDetail}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function MixVideoTable({
  rows,
  videos,
  probingDurations,
  disabled,
  jobActive = false,
  rowJobStates,
  mixValidation,
  onAddRow,
  onRemoveRow,
  onToggleLeading,
}: MixVideoTableProps) {
  const { colors, typography } = APP_DARK_THEME;
  const tableDisabled = disabled || jobActive;

  async function handlePreviewRow(row: MixRow) {
    const firstPath = row.leadingPaths[0];
    if (!firstPath) {
      toast.error("Chọn ít nhất một video đầu để xem trước.");
      return;
    }
    try {
      const client = await createBridgeClient();
      const result = await client.openMediaFile(firstPath);
      if (!result.ok) {
        toast.error(result.message || "Không mở được video.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không mở được video xem trước.";
      toast.error(message);
    }
  }

  if (videos.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm" style={{ color: colors.muted }}>
        Thêm video vào thư mục đầu vào để cấu hình mix.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-10" />
            <col className="w-[11.5rem]" />
            <col className="w-[6.5rem]" />
            <col className="w-[4.5rem]" />
            <col className="w-[4.25rem]" />
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
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">
                Video đầu ({MIN_LEADING_VIDEOS_PER_ROW}–{MAX_LEADING_VIDEOS_PER_ROW})
              </th>
              <th className="px-2 py-2 font-semibold">Trạng thái</th>
              <th className="px-2 py-2 text-right font-semibold">Tổng đầu</th>
              <th className="px-2 py-2 text-center font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const usedElsewhere = pathsUsedInOtherRows(rows, row.id);
              const leadingTotal = sumLeadingDuration(row, videos);
              const canPreview = row.leadingPaths.length > 0;
              const rowLocked =
                tableDisabled ||
                rowJobStates?.[row.id]?.status === "running" ||
                rowJobStates?.[row.id]?.status === "pending";

              return (
                <tr
                  key={row.id}
                  className="border-b align-top"
                  style={{ borderColor: colors.border }}
                >
                  <td
                    className="px-2 py-2 tabular-nums font-medium"
                    style={{ color: colors.foreground }}
                  >
                    {index + 1}
                  </td>
                  <td className="px-2 py-2">
                    <div
                      className="max-h-28 space-y-0.5 overflow-y-auto rounded-md border p-1.5"
                      style={{ borderColor: colors.border }}
                    >
                      {videos.map((video) => {
                        const checked = row.leadingPaths.includes(video.path);
                        const blocked =
                          !checked &&
                          (usedElsewhere.has(video.path) ||
                            !canToggleLeadingVideo(rows, row.id, video.path, checked));

                        return (
                          <label
                            key={video.path}
                            className={cn(
                              "flex cursor-pointer items-center gap-1.5 rounded px-0.5 py-0.5 text-[0.6875rem] leading-tight hover:bg-white/5",
                              (blocked || rowLocked) && "cursor-not-allowed opacity-45",
                            )}
                            title={video.name}
                          >
                            <input
                              type="checkbox"
                              className="size-3 shrink-0 accent-[var(--app-accent)]"
                              checked={checked}
                              disabled={rowLocked || blocked}
                              onChange={() => onToggleLeading(row.id, video.path)}
                            />
                            <span className="min-w-0 flex-1 truncate">{video.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-middle">
                    <MixRowStatusCell
                      row={row}
                      rowIndex={index}
                      videos={videos}
                      jobActive={jobActive}
                      rowJobStates={rowJobStates}
                      mixValidation={mixValidation}
                    />
                  </td>
                  <td
                    className="px-2 py-2 text-right align-middle tabular-nums text-xs"
                    style={{ color: colors.muted }}
                  >
                    {leadingTotal != null ? formatDuration(leadingTotal) : "—"}
                  </td>
                  <td className="px-1 py-2 align-middle">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        className="rounded p-1.5 text-white/55 hover:bg-white/10 hover:text-[var(--app-accent)] disabled:opacity-35"
                        disabled={tableDisabled || !canPreview}
                        title="Xem trước video đầu tiên"
                        onClick={() => void handlePreviewRow(row)}
                      >
                        <Eye className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-rose-400 disabled:opacity-40"
                        disabled={tableDisabled}
                        title="Xóa dòng"
                        onClick={() => onRemoveRow(row.id)}
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
            Chưa có dòng mix. Bấm &quot;Thêm dòng&quot; để tạo output mới.
          </p>
        ) : null}
      </div>

      <div
        className="shrink-0 border-t px-3 py-2"
        style={{ borderColor: colors.border }}
      >
        <AppToneButton
          icon={Plus}
          tone="teal"
          size="sm"
          showIconBox={false}
          disabled={tableDisabled}
          onClick={onAddRow}
        >
          Thêm dòng
        </AppToneButton>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: colors.muted }}>
          Mỗi dòng = một video đầu ra. Chọn 1–5 clip đầu; phần còn lại ghép ngẫu nhiên từ
          thư mục (không cắt clip, không trùng clip đã dùng ở dòng khác).
          {jobActive
            ? " Ghép chạy song song theo số luồng trong cài đặt xuất."
            : null}
        </p>
      </div>
    </div>
  );
}
