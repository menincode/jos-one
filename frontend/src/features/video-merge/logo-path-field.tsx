import { ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { AppToneButton } from "@/components/common/app-tone-button";
import { Input } from "@/components/ui/input";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

type LogoPathFieldProps = {
  id: string;
  value: string;
  onChange: (value: string, options?: { immediate?: boolean }) => void;
  disabled?: boolean;
  /** Fallback when logo path is empty (e.g. input/output folder). */
  directoryHint?: string;
};

export function LogoPathField({
  id,
  value,
  onChange,
  disabled,
  directoryHint = "",
}: LogoPathFieldProps) {
  const { colors, typography } = APP_DARK_THEME;

  async function handleBrowse() {
    try {
      const client = await createBridgeClient();
      const hint = value.trim() || directoryHint.trim();
      const result = await client.openImageFileDialog(hint);
      if (result.ok && result.path) {
        onChange(result.path, { immediate: true });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không mở được hộp thoại chọn logo.";
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
        Logo
      </label>
      <div className="flex min-w-0 gap-2">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Đường dẫn file logo (PNG, JPG…)"
          disabled={disabled}
          className="min-w-0 flex-1 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/35 focus-visible:ring-[var(--app-accent)]"
          spellCheck={false}
        />
        <AppToneButton
          icon={ImagePlus}
          tone="pink"
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
