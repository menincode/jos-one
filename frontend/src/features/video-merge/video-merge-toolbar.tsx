import { FolderOpen, Play, RefreshCw, Square } from "lucide-react";
import { toast } from "sonner";

import { AppToneButton } from "@/components/common/app-tone-button";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { cn } from "@/lib/utils";
import { createBridgeClient } from "@/lib/pywebview/api-client";

type VideoMergeToolbarProps = {
  outputFolder: string;
  canOpenOutputFolder: boolean;
  canStartMerge: boolean;
  startHint?: string;
  isRunning: boolean;
  isCancelling?: boolean;
  loadingVideos: boolean;
  hasInputFolder: boolean;
  onRefreshVideos: () => void;
  onStart: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
};

export function VideoMergeToolbar({
  outputFolder,
  canOpenOutputFolder,
  canStartMerge,
  startHint,
  isRunning,
  isCancelling = false,
  loadingVideos,
  hasInputFolder,
  onRefreshVideos,
  onStart,
  onCancel,
}: VideoMergeToolbarProps) {
  const { colors, radius } = APP_DARK_THEME;

  async function handleOpenOutputFolder() {
    const path = outputFolder.trim();
    if (!path) {
      toast.error("Chọn hoặc dán đường dẫn thư mục đầu ra trước.");
      return;
    }
    try {
      const client = await createBridgeClient();
      const result = await client.openFolderInExplorer(path);
      if (!result.ok) {
        toast.error(
          result.message ||
            "Không mở được thư mục. Kiểm tra đường dẫn hoặc tạo thư mục trước.",
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không mở được thư mục đầu ra.";
      toast.error(message);
    }
  }

  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-center gap-2 rounded-xl border px-3 py-2.5"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: radius.card,
      }}
    >
      <AppToneButton
        icon={FolderOpen}
        tone="amber"
        size="sm"
        showIconBox={false}
        className="shrink-0"
        disabled={!canOpenOutputFolder}
        title={
          canOpenOutputFolder
            ? "Mở thư mục đầu ra trong File Explorer"
            : "Nhập thư mục đầu ra để mở"
        }
        onClick={() => void handleOpenOutputFolder()}
      >
        Mở thư mục đầu ra
      </AppToneButton>

      <AppToneButton
        icon={RefreshCw}
        tone="teal"
        size="sm"
        showIconBox={false}
        className={cn("shrink-0", loadingVideos && "[&_svg]:animate-spin")}
        disabled={!hasInputFolder || loadingVideos || isRunning}
        onClick={onRefreshVideos}
        title="Tải lại danh sách video trong thư mục đầu vào"
      >
        Refresh video
      </AppToneButton>

      <button
        type="button"
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-lg transition-[filter,opacity]",
          "hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100",
        )}
        style={{
          background: `linear-gradient(135deg, ${colors.headerGradientFrom}, ${colors.headerGradientTo})`,
        }}
        disabled={!canStartMerge}
        title={startHint ?? (canStartMerge ? "Bắt đầu ghép video" : undefined)}
        onClick={() => void onStart()}
      >
        <Play className="size-4" strokeWidth={2.25} aria-hidden />
        Bắt đầu
      </button>

      <AppToneButton
        icon={Square}
        tone="rose"
        size="sm"
        showIconBox={false}
        className="shrink-0"
        disabled={!isRunning || isCancelling}
        title={
          isCancelling
            ? "Đang dừng FFmpeg và các luồng xử lý…"
            : isRunning
              ? "Hủy tác vụ ghép đang chạy"
              : "Chỉ dùng khi đang ghép"
        }
        onClick={() => void onCancel()}
      >
        {isCancelling ? "Đang hủy…" : "Hủy"}
      </AppToneButton>
    </div>
  );
}
