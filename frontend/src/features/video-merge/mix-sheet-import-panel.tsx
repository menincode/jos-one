import { FileSpreadsheet, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppToneButton } from "@/components/common/app-tone-button";
import { Input } from "@/components/ui/input";
import {
  buildMixRowsFromSheet,
  DEFAULT_MIX_SHEET_URL,
} from "@/features/video-merge/mix-sheet-import";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import type { VideoFileItem } from "@/lib/pywebview/types";

type MixSheetImportPanelProps = {
  open: boolean;
  disabled?: boolean;
  videos: VideoFileItem[];
  existingMixCount: number;
  onClose: () => void;
  onImport: (rows: MixRow[]) => void | Promise<void>;
};

export function MixSheetImportPanel({
  open,
  disabled,
  videos,
  existingMixCount,
  onClose,
  onImport,
}: MixSheetImportPanelProps) {
  const { colors, radius } = APP_DARK_THEME;
  const [url, setUrl] = useState(DEFAULT_MIX_SHEET_URL);
  const [loading, setLoading] = useState(false);

  if (!open) {
    return null;
  }

  async function handleImport() {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast.error("Nhập URL Google Sheet.");
      return;
    }
    if (videos.length === 0) {
      toast.error("Thư mục đầu vào chưa có video để khớp với sheet.");
      return;
    }

    if (existingMixCount > 0) {
      const confirmed = window.confirm(
        `Import sẽ thay thế ${existingMixCount} mix hiện có. Tiếp tục?`,
      );
      if (!confirmed) {
        return;
      }
    }

    setLoading(true);
    try {
      const client = await createBridgeClient();
      const fetched = await client.fetchGoogleSheetRows(trimmedUrl);
      if (!fetched.ok) {
        toast.error(fetched.message || "Không tải được Google Sheet.");
        return;
      }

      const built = buildMixRowsFromSheet(fetched.rows, videos);
      if (!built.ok) {
        toast.error(built.error);
        if (built.warnings.length > 0) {
          toast.message(built.warnings.slice(0, 3).join("\n"));
        }
        return;
      }

      await onImport(built.rows);
      onClose();
      const replacedLabel =
        existingMixCount > 0
          ? `Đã thay thế ${existingMixCount} mix bằng ${built.rows.length} mix từ Google Sheet.`
          : `Đã import ${built.rows.length} mix từ Google Sheet.`;
      toast.success(replacedLabel);
      if (built.warnings.length > 0) {
        toast.message(
          built.warnings.length <= 3
            ? built.warnings.join("\n")
            : `${built.warnings.slice(0, 3).join("\n")}\n… và ${built.warnings.length - 3} cảnh báo khác.`,
          { duration: 8000 },
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Import Google Sheet thất bại.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg border p-4 shadow-xl"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.card,
        }}
        role="dialog"
        aria-labelledby="mix-sheet-import-title"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2
              id="mix-sheet-import-title"
              className="text-sm font-semibold"
              style={{ color: colors.foreground }}
            >
              Import mix từ Google Sheet
            </h2>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: colors.muted }}>
              Xóa toàn bộ mix hiện có và thay bằng dữ liệu sheet. Bỏ qua dòng 1 (header).
              Mỗi cột là một video đầu trong mix; mỗi dòng là một mix. Tên file có hoặc không có
              đuôi (.mp4, …).
            </p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-40"
            disabled={loading}
            aria-label="Đóng"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium" style={{ color: colors.muted }}>
          URL Google Sheet
        </label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={disabled || loading}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          className="mb-4 text-sm"
        />

        <div className="flex justify-end gap-2">
          <AppToneButton
            icon={X}
            tone="blue"
            size="sm"
            showIconBox={false}
            disabled={loading}
            onClick={onClose}
          >
            Hủy
          </AppToneButton>
          <AppToneButton
            icon={loading ? Loader2 : FileSpreadsheet}
            tone="teal"
            size="sm"
            showIconBox={false}
            className={loading ? "[&_svg]:animate-spin" : undefined}
            disabled={disabled || loading}
            onClick={() => void handleImport()}
          >
            {loading ? "Đang tải…" : "Import"}
          </AppToneButton>
        </div>
      </div>
    </div>
  );
}
