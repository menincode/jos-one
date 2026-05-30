/**
 * Semantic toast colors aligned with the in-app dark theme (navy surfaces + accent teal).
 * Consumed by Sonner via CSS variables on [data-sonner-toaster].
 */
export const TOAST_COLORS = {
  normal: {
    bg: "#1a1f35",
    border: "rgba(255, 255, 255, 0.1)",
    text: "#ffffff",
    bgHover: "#222840",
    borderHover: "rgba(255, 255, 255, 0.14)",
  },
  success: {
    bg: "#0f2d2f",
    border: "#1db9c3",
    text: "#a5f3fc",
  },
  error: {
    bg: "#2d1519",
    border: "#f43f5e",
    text: "#fecdd3",
  },
  warning: {
    bg: "#2d2410",
    border: "#f59e0b",
    text: "#fde68a",
  },
  info: {
    bg: "#121e35",
    border: "#3b82f6",
    text: "#bfdbfe",
  },
} as const;

/** CSS custom properties for Sonner richColors + dark theme. */
export const toastThemeCssVars: Record<string, string> = {
  "--normal-bg": TOAST_COLORS.normal.bg,
  "--normal-border": TOAST_COLORS.normal.border,
  "--normal-text": TOAST_COLORS.normal.text,
  "--normal-bg-hover": TOAST_COLORS.normal.bgHover,
  "--normal-border-hover": TOAST_COLORS.normal.borderHover,

  "--success-bg": TOAST_COLORS.success.bg,
  "--success-border": TOAST_COLORS.success.border,
  "--success-text": TOAST_COLORS.success.text,

  "--error-bg": TOAST_COLORS.error.bg,
  "--error-border": TOAST_COLORS.error.border,
  "--error-text": TOAST_COLORS.error.text,

  "--warning-bg": TOAST_COLORS.warning.bg,
  "--warning-border": TOAST_COLORS.warning.border,
  "--warning-text": TOAST_COLORS.warning.text,

  "--info-bg": TOAST_COLORS.info.bg,
  "--info-border": TOAST_COLORS.info.border,
  "--info-text": TOAST_COLORS.info.text,
};
