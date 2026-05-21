import { FolderOpen, Play, Square } from "lucide-react";
import { toast } from "sonner";

import { AppToneButton } from "@/components/common/app-tone-button";
import { MergeFlowStatusBadge } from "@/features/video-merge/merge-flow-status-badge";
import type { MergeFlowStatusDisplay } from "@/features/video-merge/merge-flow-status";
import { cn } from "@/lib/utils";
import { createBridgeClient } from "@/lib/pywebview/api-client";

type VideoMergeExportActionsProps = {
  outputFolder: string;
  canOpenOutputFolder: boolean;
  canStartMerge: boolean;
  startHint?: string;
  flowStatus: MergeFlowStatusDisplay;
  isRunning: boolean;
  onStart: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
  variant?: "stack" | "row";
};

export function VideoMergeExportActions({
  outputFolder,
  canOpenOutputFolder,
  canStartMerge,
  startHint,
  flowStatus,
  isRunning,
  onStart,
  onCancel,
  variant = "stack",
}: VideoMergeExportActionsProps) {
  const isRow = variant === "row";

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

  const statusBadge = (
    <MergeFlowStatusBadge display={flowStatus} align={isRow ? "right" : "left"} />
  );

  return (
    <div
      className={cn(
        isRow ? "space-y-2" : "space-y-2 border-t border-white/6 p-4",
      )}
    >
      <div
        className={cn(
          "gap-2",
          isRow ? "flex flex-wrap items-center" : "flex flex-col",
        )}
      >
        <div className={cn("flex flex-wrap items-center gap-2", isRow && "min-w-0 flex-1")}>
          <AppToneButton
            icon={FolderOpen}
            tone="amber"
            size="sm"
            showIconBox={false}
            className={cn(isRow ? "shrink-0" : "w-full")}
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
            icon={Play}
            tone="green"
            size="sm"
            showIconBox={false}
            className={cn(isRow ? "shrink-0" : "w-full")}
            disabled={!canStartMerge}
            title={startHint ?? (canStartMerge ? "Bắt đầu ghép video" : undefined)}
            onClick={() => void onStart()}
          >
            Bắt đầu
          </AppToneButton>

          <AppToneButton
            icon={Square}
            tone="rose"
            size="sm"
            showIconBox={false}
            className={cn(isRow ? "shrink-0" : "w-full")}
            disabled={!isRunning}
            title={isRunning ? "Hủy tác vụ ghép đang chạy" : "Chỉ dùng khi đang ghép"}
            onClick={() => void onCancel()}
          >
            Hủy
          </AppToneButton>
        </div>

        {isRow ? statusBadge : null}
      </div>

      {!isRow ? statusBadge : null}
    </div>
  );
}
