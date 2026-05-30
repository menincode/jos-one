import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { APP_DARK_THEME } from "@/theme/app-dark-theme";

type PageHeaderProps = {
  title: string;
  icon?: LucideIcon;
  subtitle?: ReactNode;
  titleBadge?: ReactNode;
};

function TitleRow({
  title,
  titleBadge,
}: {
  title: string;
  titleBadge?: ReactNode;
}) {
  const { typography } = APP_DARK_THEME;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <h1
        className="font-bold leading-tight tracking-tight"
        style={{ fontSize: typography.pageTitle }}
      >
        {title}
      </h1>
      {titleBadge}
    </div>
  );
}

export function PageHeader({ title, icon: Icon, subtitle, titleBadge }: PageHeaderProps) {
  const { colors, typography, radius } = APP_DARK_THEME;

  if (!Icon) {
    return (
      <header className="mb-2 shrink-0">
        <TitleRow title={title} titleBadge={titleBadge} />
        {subtitle ? (
          <p
            className="mt-0.5 truncate"
            style={{ color: colors.muted, fontSize: typography.rowMeta }}
          >
            {subtitle}
          </p>
        ) : null}
      </header>
    );
  }

  return (
    <header className="mb-4 flex items-center gap-3">
      <span
        className="flex size-11 shrink-0 items-center justify-center text-white shadow-sm"
        style={{
          borderRadius: radius.iconBox,
          background: `linear-gradient(135deg, ${colors.headerGradientFrom}, ${colors.headerGradientTo})`,
        }}
      >
        <Icon className="size-5" strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <TitleRow title={title} titleBadge={titleBadge} />
        {subtitle ? (
          <p
            className="mt-0.5 truncate"
            style={{ color: colors.muted, fontSize: typography.rowMeta }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
