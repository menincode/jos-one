import type { LucideIcon } from "lucide-react";

import { AppPage, MainSection } from "@/components/layout";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

type PlaceholderTabPageProps = {
  title: string;
  icon: LucideIcon;
  description: string;
};

export function PlaceholderTabPage({
  title,
  icon,
  description,
}: PlaceholderTabPageProps) {
  const { colors } = APP_DARK_THEME;

  return (
    <AppPage title={title} icon={icon}>
      <MainSection variant="plain">
        <p className="py-2 text-sm leading-relaxed" style={{ color: colors.muted }}>
          {description}
        </p>
      </MainSection>
    </AppPage>
  );
}
