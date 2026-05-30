import { cn } from "@/lib/utils";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

type SettingsToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label": string;
};

export function SettingsToggle({
  checked,
  onCheckedChange,
  "aria-label": ariaLabel,
}: SettingsToggleProps) {
  const { colors } = APP_DARK_THEME;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
      )}
      style={{
        backgroundColor: checked ? colors.accentMuted : "rgba(255,255,255,0.12)",
      }}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full shadow-sm transition-transform",
          checked ? "translate-x-[1.375rem]" : "translate-x-1",
        )}
        style={{
          backgroundColor: checked ? colors.accent : "#94a3b8",
        }}
      />
    </button>
  );
}
