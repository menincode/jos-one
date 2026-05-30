import {
  ChevronLeft,
  ChevronRight,
  Film,
  FolderPlus,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AppToneButton } from "@/components/common/app-tone-button";
import { formatBytes } from "@/features/video-merge/format-bytes";
import { formatDuration } from "@/features/video-merge/format-duration";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import { getVideoMixUsageLabel } from "@/features/video-merge/mix-row-utils";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { cn } from "@/lib/utils";
import type { VideoFileItem } from "@/lib/pywebview/types";

export const VIDEO_FOLDER_PAGE_SIZE = 6;

type VideoFolderListPanelProps = {
  videos: VideoFileItem[];
  mixRows: MixRow[];
  loading: boolean;
  probingDurations: boolean;
  folderPath: string;
  disabled?: boolean;
  selectedPaths: Set<string>;
  selectedMixRowId: string | null;
  onToggleSelect: (path: string) => void;
  onAddToSelectedMix: () => void;
  onCreateMix: () => void;
};

function formatVideoMeta(video: VideoFileItem, probingDurations: boolean): string {
  const durationPending =
    probingDurations && (video.duration_sec == null || video.duration_sec === undefined);
  const durationPart = durationPending ? "…" : formatDuration(video.duration_sec);
  const sizePart = formatBytes(video.size_bytes);
  return `${durationPart} • ${sizePart}`;
}

export function VideoFolderListPanel({
  videos,
  mixRows,
  loading,
  probingDurations,
  folderPath,
  disabled,
  selectedPaths,
  selectedMixRowId,
  onToggleSelect,
  onAddToSelectedMix,
  onCreateMix,
}: VideoFolderListPanelProps) {
  const { colors, typography } = APP_DARK_THEME;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const hasFolder = folderPath.trim().length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return videos;
    }
    return videos.filter((v) => v.name.toLowerCase().includes(q));
  }, [videos, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / VIDEO_FOLDER_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * VIDEO_FOLDER_PAGE_SIZE;
  const pageVideos = filtered.slice(pageStart, pageStart + VIDEO_FOLDER_PAGE_SIZE);

  if (!hasFolder) {
    return (
      <p className="px-4 py-12 text-center text-sm" style={{ color: colors.muted }}>
        Chọn thư mục đầu vào để xem danh sách video.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-16 text-sm" style={{ color: colors.muted }}>
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Đang quét thư mục…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-3 py-2" style={{ borderColor: colors.border }}>
        <div
          className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
          style={{ borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" }}
        >
          <Search className="size-4 shrink-0 opacity-50" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm kiếm video..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm" style={{ color: colors.muted }}>
            {search.trim() ? "Không tìm thấy video phù hợp." : "Không có file video trong thư mục này."}
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: colors.border }}>
            {pageVideos.map((video) => {
              const usage = getVideoMixUsageLabel(video.path, mixRows);
              const checked = selectedPaths.has(video.path);

              return (
                <li
                  key={video.path}
                  className="flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-3.5 shrink-0 accent-[var(--app-accent)]"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggleSelect(video.path)}
                    aria-label={`Chọn ${video.name}`}
                  />
                  <span
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "rgba(29, 185, 195, 0.12)" }}
                  >
                    <Film className="size-4" style={{ color: colors.accent }} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-medium"
                      style={{ color: colors.foreground, fontSize: typography.rowLabel }}
                      title={video.name}
                    >
                      {video.name}
                    </p>
                    <p
                      className="mt-0.5 text-xs tabular-nums"
                      style={{ color: colors.muted }}
                    >
                      {formatVideoMeta(video, probingDurations)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "max-w-[11rem] shrink-0 rounded-lg px-2 py-1 text-right text-[0.6875rem] font-medium leading-snug break-words whitespace-normal",
                      usage ? "text-sky-300" : "text-white/40",
                    )}
                    style={
                      usage
                        ? { backgroundColor: "rgba(56, 189, 248, 0.12)" }
                        : { backgroundColor: "rgba(255,255,255,0.06)" }
                    }
                  >
                    {usage ?? "Chưa dùng"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {filtered.length > 0 ? (
        <div
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs"
          style={{ borderColor: colors.border, color: colors.muted }}
        >
          <span className="tabular-nums">
            Hiển thị {Math.min(pageStart + pageVideos.length, filtered.length)} / {filtered.length}{" "}
            video
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-1 hover:bg-white/10 disabled:opacity-35"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Trang trước"
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={cn(
                  "min-w-7 rounded px-1.5 py-0.5 tabular-nums",
                  n === safePage
                    ? "bg-violet-500/25 font-semibold text-violet-200"
                    : "hover:bg-white/10",
                )}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="rounded p-1 hover:bg-white/10 disabled:opacity-35"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Trang sau"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div
        className="flex shrink-0 flex-wrap gap-2 border-t px-3 py-2.5"
        style={{ borderColor: colors.border }}
      >
        <AppToneButton
          icon={Plus}
          tone="teal"
          size="sm"
          showIconBox={false}
          disabled={disabled || !selectedMixRowId}
          title={
            !selectedMixRowId
              ? "Chọn một mix ở bảng bên phải"
              : "Áp dụng các video đã tick vào mix đang chọn (số video đầu chỉ đổi khi bấm nút này)"
          }
          onClick={onAddToSelectedMix}
        >
          Thêm vào mix đang chọn
        </AppToneButton>
        <AppToneButton
          icon={FolderPlus}
          tone="purple"
          size="sm"
          showIconBox={false}
          disabled={disabled || selectedPaths.size === 0}
          title={
            selectedPaths.size === 0
              ? "Chọn video bên trên trước khi tạo mix mới"
              : "Tạo mix mới với các video đã chọn"
          }
          onClick={onCreateMix}
        >
          Tạo mix mới
        </AppToneButton>
      </div>
    </div>
  );
}
