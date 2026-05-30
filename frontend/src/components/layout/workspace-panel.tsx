import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

export type WorkspacePanelProps = {
  /** Omit to hide the panel sub-header (e.g. full-bleed placeholder content). */
  title?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  badge?: string;
  /** Override scroll on the body (e.g. `overflow-hidden` when children scroll internally). */
  contentClassName?: string;
};

/** Full-height panel used on desktop workspace routes (Ghép Video, Cài đặt, Prompt AI). */
export function WorkspacePanel({
  title,
  children,
  className,
  headerAction,
  badge,
  contentClassName,
}: WorkspacePanelProps) {
  const { colors, radius, typography } = APP_DARK_THEME;

  return (
    <section
      className={cn("flex min-h-0 flex-col overflow-hidden", className)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        border: `1px solid ${colors.border}`,
      }}
    >
      {title ? (
        <header
          className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: colors.border }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <h2
              className="font-semibold uppercase tracking-wider"
              style={{ color: colors.muted, fontSize: typography.sectionLabel }}
            >
              {title}
            </h2>
            {badge ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
                style={{
                  backgroundColor: "rgba(29, 185, 195, 0.15)",
                  color: colors.accent,
                }}
              >
                {badge}
              </span>
            ) : null}
          </div>
          {headerAction}
        </header>
      ) : null}
      <div className={cn("min-h-0 flex-1 overflow-y-auto", contentClassName)}>
        {children}
      </div>
    </section>
  );
}
