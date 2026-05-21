import { Film, Loader2 } from "lucide-react";

import { formatBytes } from "@/features/video-merge/format-bytes";
import { formatDuration } from "@/features/video-merge/format-duration";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { cn } from "@/lib/utils";
import type { VideoFileItem } from "@/lib/pywebview/types";

/** Scroll vertically when the folder has more than this many videos. */
export const VIDEO_FILES_TABLE_MAX_ROWS = 20;

/** Matches `py-3` table rows (px) for max-height calculation. */
const TABLE_HEAD_ROW_PX = 44;
const TABLE_BODY_ROW_PX = 52;

type VideoFilesTableProps = {
  videos: VideoFileItem[];
  loading: boolean;
  probingDurations: boolean;
  folderPath: string;
};

export function VideoFilesTable({
  videos,
  loading,
  probingDurations,
  folderPath,
}: VideoFilesTableProps) {
  const { colors, typography } = APP_DARK_THEME;
  const hasFolder = folderPath.trim().length > 0;

  if (!hasFolder) {
    return (
      <p
        className="px-4 py-12 text-center text-sm leading-relaxed"
        style={{ color: colors.muted }}
      >
        Chọn thư mục đầu vào để xem danh sách video.
      </p>
    );
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-16 text-sm"
        style={{ color: colors.muted }}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Đang quét thư mục…
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <p
        className="px-4 py-12 text-center text-sm leading-relaxed"
        style={{ color: colors.muted }}
      >
        Không có file video trong thư mục này (MP4, MOV, WEBM, MKV, …).
      </p>
    );
  }

  const scrollable = videos.length > VIDEO_FILES_TABLE_MAX_ROWS;
  const maxScrollHeightPx =
    TABLE_HEAD_ROW_PX + TABLE_BODY_ROW_PX * VIDEO_FILES_TABLE_MAX_ROWS;

  return (
    <div
      className={cn(
        "min-h-0 overflow-x-auto",
        scrollable && "h-full overflow-y-auto",
      )}
      style={scrollable ? { maxHeight: maxScrollHeightPx } : undefined}
    >
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-12" />
          <col />
          <col className="w-20" />
          <col className="w-28" />
        </colgroup>
        <thead
          className={cn(scrollable && "sticky top-0 z-[1]")}
          style={scrollable ? { backgroundColor: colors.surface } : undefined}
        >
          <tr
            className="border-b uppercase tracking-wider"
            style={{
              borderColor: colors.border,
              color: colors.muted,
              fontSize: typography.sectionLabel,
            }}
          >
            <th className="px-4 py-3 font-semibold">#</th>
            <th className="px-4 py-3 font-semibold">Tên file</th>
            <th className="px-4 py-3 text-right font-semibold">Thời gian</th>
            <th className="px-4 py-3 text-right font-semibold">Dung lượng</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((video, index) => {
            const durationPending =
              probingDurations && (video.duration_sec == null || video.duration_sec === undefined);

            return (
              <tr
                key={video.path}
                className="border-b transition-colors hover:bg-white/[0.03]"
                style={{ borderColor: colors.border }}
              >
                <td
                  className="px-4 py-3 tabular-nums"
                  style={{ color: colors.muted, fontSize: typography.rowMeta }}
                >
                  {index + 1}
                </td>
                <td className="max-w-0 overflow-hidden px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "rgba(29, 185, 195, 0.12)" }}
                    >
                      <Film className="size-4" style={{ color: colors.accent }} aria-hidden />
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate font-medium"
                      style={{ color: colors.foreground, fontSize: typography.rowLabel }}
                      title={video.name}
                    >
                      {video.name}
                    </span>
                  </div>
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums font-medium"
                  style={{ color: colors.foreground, fontSize: typography.rowMeta }}
                >
                  {durationPending ? (
                    <Loader2
                      className="ml-auto size-3.5 animate-spin opacity-60"
                      aria-label="Đang đo thời lượng"
                    />
                  ) : (
                    <span title={formatDuration(video.duration_sec)}>
                      {formatDuration(video.duration_sec)}
                    </span>
                  )}
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums font-medium"
                  style={{ color: colors.foreground, fontSize: typography.rowMeta }}
                >
                  {formatBytes(video.size_bytes)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
