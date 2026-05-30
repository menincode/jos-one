import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

export type AppPageProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: LucideIcon;
  subtitle?: ReactNode;
  titleBadge?: ReactNode;
};

/**
 * Standard page shell inside AppShell: padding, vertical rhythm, optional header.
 */
export function AppPage({
  children,
  className,
  title,
  icon,
  subtitle,
  titleBadge,
}: AppPageProps) {
  const { spacing } = APP_DARK_THEME;

  return (
    <div
      className={cn("space-y-3", className)}
      style={{
        paddingInline: spacing.pageX,
        paddingTop: spacing.pageY,
        paddingBottom: spacing.pageY,
      }}
    >
      {title ? (
        <PageHeader title={title} icon={icon} subtitle={subtitle} titleBadge={titleBadge} />
      ) : null}
      {children}
    </div>
  );
}
