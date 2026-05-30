import type { ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/utils";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

export type MainSectionProps = {
  /** Uppercase section label (e.g. Tài khoản, Hệ thống). */
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** `card`: surface container with row dividers; `plain`: no card wrapper. */
  variant?: "card" | "plain";
};

/**
 * Standard content section for authenticated app pages.
 * Matches the Settings reference UI (label + rounded surface card).
 */
export function MainSection({
  title,
  description,
  children,
  className,
  variant = "card",
}: MainSectionProps) {
  const { colors, radius, spacing, typography } = APP_DARK_THEME;
  const titleId = useId();

  return (
    <section
      className={cn("space-y-2", className)}
      aria-labelledby={title ? titleId : undefined}
    >
      {title ? (
        <div className="px-1">
          <h2
            id={titleId}
            className="font-semibold uppercase tracking-wider"
            style={{
              color: colors.muted,
              fontSize: typography.sectionLabel,
            }}
          >
            {title}
          </h2>
          {description ? (
            <p
              className="mt-1 normal-case tracking-normal"
              style={{ color: colors.muted, fontSize: typography.rowMeta }}
            >
              {description}
            </p>
          ) : null}
        </div>
      ) : null}

      {variant === "card" ? (
        <div
          className="overflow-hidden"
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.card,
          }}
        >
          <div
            className="divide-y divide-white/6"
            style={{ paddingInline: spacing.rowPaddingX }}
          >
            {children}
          </div>
        </div>
      ) : (
        <div style={{ paddingInline: spacing.rowPaddingX }}>{children}</div>
      )}
    </section>
  );
}
