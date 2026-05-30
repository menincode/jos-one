import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  APP_DARK_THEME,
  APP_ICON_TONES,
  type AppIconTone,
} from "@/theme/app-dark-theme";

type SettingsRowProps = {
  icon: LucideIcon;
  iconTone: AppIconTone;
  label: string;
  meta?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
};

export function SettingsRow({
  icon: Icon,
  iconTone,
  label,
  meta,
  trailing,
  onClick,
  className,
}: SettingsRowProps) {
  const { colors, radius, spacing, typography } = APP_DARK_THEME;
  const tone = APP_ICON_TONES[iconTone];
  const interactive = Boolean(onClick);

  const content = (
    <>
      <span
        className="flex size-9 shrink-0 items-center justify-center"
        style={{
          backgroundColor: tone.bg,
          borderRadius: radius.iconBox,
          color: tone.fg,
        }}
      >
        <Icon className="size-[1.125rem]" strokeWidth={2} />
      </span>
      <span
        className="min-w-0 flex-1 font-medium"
        style={{ fontSize: typography.rowLabel }}
      >
        {label}
      </span>
      {meta ? (
        <span
          className="shrink-0"
          style={{ color: colors.muted, fontSize: typography.rowMeta }}
        >
          {meta}
        </span>
      ) : null}
      {trailing ?? (
        <ChevronRight
          className="size-4 shrink-0 opacity-60"
          style={{ color: colors.muted }}
        />
      )}
    </>
  );

  const rowClass = cn(
    "flex w-full items-center gap-3 text-left transition-opacity",
    interactive && "hover:opacity-90 active:opacity-80",
    className,
  );

  const style = {
    paddingBlock: spacing.rowPaddingY,
    color: colors.foreground,
  };

  if (interactive) {
    return (
      <button type="button" className={rowClass} style={style} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <div className={rowClass} style={style}>
      {content}
    </div>
  );
}
