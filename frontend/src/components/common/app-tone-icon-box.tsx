import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  APP_DARK_THEME,
  APP_ICON_TONES,
  type AppIconTone,
} from "@/theme/app-dark-theme";

type AppToneIconBoxProps = {
  icon: LucideIcon;
  tone: AppIconTone;
  size?: "sm" | "md";
  strokeWidth?: number;
  className?: string;
};

export function AppToneIconBox({
  icon: Icon,
  tone,
  size = "md",
  strokeWidth = 2,
  className,
}: AppToneIconBoxProps) {
  const palette = APP_ICON_TONES[tone];
  const { radius } = APP_DARK_THEME;
  const boxClass = size === "sm" ? "size-8" : "size-9";
  const iconClass = size === "sm" ? "size-4" : "size-[1.125rem]";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        boxClass,
        className,
      )}
      style={{
        backgroundColor: palette.bg,
        borderRadius: radius.iconBox,
        color: palette.fg,
      }}
    >
      <Icon className={iconClass} strokeWidth={strokeWidth} aria-hidden />
    </span>
  );
}
