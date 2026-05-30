import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

type PanelRowsProps = {
  children: ReactNode;
  className?: string;
};

/** Divided row list inside a {@link WorkspacePanel}. */
export function PanelRows({ children, className }: PanelRowsProps) {
  const { spacing } = APP_DARK_THEME;

  return (
    <div
      className={cn("divide-y divide-white/6", className)}
      style={{ paddingInline: spacing.rowPaddingX }}
    >
      {children}
    </div>
  );
}
