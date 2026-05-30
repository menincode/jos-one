import { APP_DARK_THEME } from "@/theme/app-dark-theme";

type ComingSoonBadgeProps = {
  label?: string;
};

/** Pill shown beside page titles for features not yet released. */
export function ComingSoonBadge({ label = "Coming Soon" }: ComingSoonBadgeProps) {
  const { colors } = APP_DARK_THEME;

  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: "rgba(29, 185, 195, 0.15)",
        color: colors.accent,
      }}
    >
      {label}
    </span>
  );
}
