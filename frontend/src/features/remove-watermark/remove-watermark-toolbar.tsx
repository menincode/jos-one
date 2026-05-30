import { Eraser, FolderOpen, Loader2, RefreshCw, Square } from "lucide-react";

import { AppToneButton } from "@/components/common/app-tone-button";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { cn } from "@/lib/utils";

type RemoveWatermarkToolbarProps = {
  canOpenOutputFolder: boolean;
  canStart: boolean;
  loadingRows: boolean;
  busy: boolean;
  stopRequested: boolean;
  hasInputFolder: boolean;
  onLoadVideos: () => void;
  onOpenOutputDir: () => void;
  onStartBatch: () => void;
  onStopBatch: () => void;
};

export function RemoveWatermarkToolbar({
  canOpenOutputFolder,
  canStart,
  loadingRows,
  busy,
  stopRequested,
  hasInputFolder,
  onLoadVideos,
  onOpenOutputDir,
  onStartBatch,
  onStopBatch,
}: RemoveWatermarkToolbarProps) {
  const { colors, radius } = APP_DARK_THEME;

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
        tone="teal"
        size="sm"
        showIconBox={false}
        className="shrink-0"
        disabled={!canOpenOutputFolder}
        title={
          canOpenOutputFolder
            ? "Mở thư mục đầu ra trong File Explorer"
            : "Nhập thư mục đầu ra để mở"
        }
        onClick={onOpenOutputDir}
      >
        Mở thư mục đầu ra
      </AppToneButton>

      <AppToneButton
        icon={RefreshCw}
        tone="blue"
        size="sm"
        showIconBox={false}
        className={cn("shrink-0", loadingRows && "[&_svg]:animate-spin")}
        disabled={!hasInputFolder || loadingRows || busy}
        title="Tải lại danh sách video trong thư mục đầu vào"
        onClick={onLoadVideos}
      >
        Tải danh sách
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
        disabled={!canStart || busy}
        title={canStart ? "Bắt đầu xóa watermark hàng loạt" : undefined}
        onClick={onStartBatch}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={2.25} aria-hidden />
        ) : (
          <Eraser className="size-4" strokeWidth={2.25} aria-hidden />
        )}
        {busy ? "Đang xử lý…" : "Xóa watermark"}
      </button>

      <AppToneButton
        icon={Square}
        tone="rose"
        size="sm"
        showIconBox={false}
        className="shrink-0"
        disabled={!busy || stopRequested}
        title={
          stopRequested
            ? "Đang dừng các luồng xử lý…"
            : busy
              ? "Dừng tác vụ xóa watermark đang chạy"
              : "Chỉ dùng khi đang xử lý"
        }
        onClick={onStopBatch}
      >
        {stopRequested ? "Đang dừng…" : "Dừng"}
      </AppToneButton>
    </div>
  );
}
