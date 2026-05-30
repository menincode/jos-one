import { FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { AppToneButton } from "@/components/common/app-tone-button";
import { Input } from "@/components/ui/input";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import { APP_DARK_THEME, type AppIconTone } from "@/theme/app-dark-theme";

type FolderDialogKind = "input" | "output";

type FolderPathFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string, options?: { immediate?: boolean }) => void;
  placeholder?: string;
  /** Input: video file picker (shows files). Output: native folder picker. */
  dialogKind: FolderDialogKind;
  /** When this field is empty, open the dialog at this path (e.g. the other folder). */
  directoryHint?: string;
  browseTone?: AppIconTone;
  disabled?: boolean;
};

export function FolderPathField({
  id,
  label,
  value,
  onChange,
  placeholder = "Dán đường dẫn thư mục hoặc bấm Duyệt…",
  dialogKind,
  directoryHint = "",
  browseTone = "blue",
  disabled = false,
}: FolderPathFieldProps) {
  const { colors, typography } = APP_DARK_THEME;

  async function handleBrowse() {
    try {
      const client = await createBridgeClient();
      const hint = value.trim() || directoryHint.trim();
      const result =
        dialogKind === "input"
          ? await client.openInputFolderDialog(hint)
          : await client.openOutputFolderDialog(hint);
      if (result.ok && result.path) {
        onChange(result.path, { immediate: true });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không mở được hộp thoại chọn thư mục.";
      toast.error(message);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-semibold uppercase tracking-wider"
        style={{ color: colors.muted, fontSize: typography.sectionLabel }}
      >
        {label}
      </label>
      <div className="flex min-w-0 gap-2">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="min-w-0 flex-1 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/35 focus-visible:ring-[var(--app-accent)]"
          spellCheck={false}
        />
        <AppToneButton
          icon={FolderOpen}
          tone={browseTone}
          size="sm"
          showIconBox={false}
          className="shrink-0"
          disabled={disabled}
          onClick={() => void handleBrowse()}
        >
          Duyệt
        </AppToneButton>
      </div>
    </div>
  );
}
