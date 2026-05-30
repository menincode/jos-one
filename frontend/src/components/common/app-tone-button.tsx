import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  APP_DARK_THEME,
  APP_ICON_TONES,
  type AppIconTone,
} from "@/theme/app-dark-theme";

export type AppToneButtonProps = ComponentProps<typeof Button> & {
  icon: LucideIcon;
  tone: AppIconTone;
  /** Colored icon box like Settings rows (default on). */
  showIconBox?: boolean;
};

export function AppToneButton({
  icon: Icon,
  tone,
  showIconBox = true,
  className,
  children,
  style,
  ...props
}: AppToneButtonProps) {
  const palette = APP_ICON_TONES[tone];
  const { radius } = APP_DARK_THEME;

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "gap-2 font-medium transition-[filter,opacity,box-shadow] hover:brightness-110",
        "enabled:ring-1 enabled:ring-white/20 enabled:saturate-100",
        "disabled:opacity-35 disabled:saturate-[0.35] disabled:cursor-not-allowed disabled:hover:brightness-100",
        showIconBox ? "border" : "border-0",
        className,
      )}
      style={{
        ...(showIconBox ? { borderColor: `${palette.fg}40` } : {}),
        backgroundColor: palette.bg,
        color: palette.fg,
        ...style,
      }}
      {...props}
    >
      {showIconBox ? (
        <span
          className="flex size-7 shrink-0 items-center justify-center"
          style={{
            backgroundColor: `${palette.fg}22`,
            borderRadius: radius.iconBox,
            color: palette.fg,
          }}
        >
          <Icon className="size-3.5" strokeWidth={2.25} aria-hidden />
        </span>
      ) : (
        <Icon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
      )}
      {children}
    </Button>
  );
}
