import type { AppScope } from "@/lib/auth/scopes";

/**
 * In-app dark theme extracted from the mobile Settings (Cài đặt) reference UI.
 * Applied to authenticated screens only; login keeps the light JOSVN brand layout.
 */
export const APP_DARK_THEME = {
  colors: {
    background: "#0b0e1e",
    surface: "#1a1f35",
    surfaceElevated: "#161b2c",
    navBar: "#161b2c",
    foreground: "#ffffff",
    muted: "#8e94a5",
    border: "rgba(255, 255, 255, 0.06)",
    accent: "#1db9c3",
    accentMuted: "#159aa3",
    navActive: "#a8b4ff",
    headerGradientFrom: "#6366f1",
    headerGradientTo: "#3b82f6",
  },
  radius: {
    card: "1.125rem",
    iconBox: "0.625rem",
    pill: "9999px",
  },
  typography: {
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
    pageTitle: "1.5rem",
    sectionLabel: "0.6875rem",
    rowLabel: "0.9375rem",
    rowMeta: "0.8125rem",
  },
  spacing: {
    pageX: "1rem",
    pageY: "1.25rem",
    sectionGap: "1.25rem",
    rowPaddingY: "0.875rem",
    rowPaddingX: "1rem",
  },
} as const;

export type AppIconTone =
  | "teal"
  | "rose"
  | "pink"
  | "blue"
  | "amber"
  | "green"
  | "purple";

export const APP_ICON_TONES: Record<
  AppIconTone,
  { bg: string; fg: string }
> = {
  teal: { bg: "rgba(29, 185, 195, 0.18)", fg: "#1db9c3" },
  rose: { bg: "rgba(244, 63, 94, 0.18)", fg: "#f43f5e" },
  pink: { bg: "rgba(236, 72, 153, 0.18)", fg: "#ec4899" },
  blue: { bg: "rgba(59, 130, 246, 0.18)", fg: "#3b82f6" },
  amber: { bg: "rgba(245, 158, 11, 0.18)", fg: "#f59e0b" },
  green: { bg: "rgba(34, 197, 94, 0.18)", fg: "#22c55e" },
  purple: { bg: "rgba(139, 92, 246, 0.18)", fg: "#8b5cf6" },
};

export const APP_NAV_ITEMS = [
  {
    id: "videoMerge",
    path: "/",
    label: "Ghép Video",
    iconTone: "purple",
    requiredScope: "video_editor:write",
  },
  {
    id: "watermark",
    path: "/watermark",
    label: "Xóa watermark",
    iconTone: "teal",
    requiredScope: "remove_watermark:write",
  },
  {
    id: "videoLoop",
    path: "/loop",
    label: "Loop video",
    iconTone: "green",
    requiredScope: "video_loop:write",
  },
  {
    id: "settings",
    path: "/settings",
    label: "Cài đặt",
    iconTone: "blue",
    requiredScope: undefined,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  path: string;
  label: string;
  iconTone: AppIconTone;
  requiredScope?: AppScope;
}>;
