import type { ReactNode } from "react";

import { MainSection } from "@/components/layout/main-section";

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

/** @deprecated Prefer {@link MainSection} — kept for settings-specific imports. */
export function SettingsSection({ title, children, className }: SettingsSectionProps) {
  return (
    <MainSection title={title} className={className}>
      {children}
    </MainSection>
  );
}
