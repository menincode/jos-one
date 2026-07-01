import type { AppUser } from "@/types/app-user";

export const APP_SCOPES = {
  VIDEO_EDITOR_WRITE: "video_editor:write",
  REMOVE_WATERMARK_WRITE: "remove_watermark:write",
  VIDEO_LOOP_WRITE: "video_loop:write",
} as const;

export type AppScope = (typeof APP_SCOPES)[keyof typeof APP_SCOPES];

export function parseScopes(raw: unknown): string[] {
  if (raw == null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }

  const text = String(raw).trim();
  if (!text) {
    return [];
  }

  return text
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isAdmin(user: AppUser | null | undefined): boolean {
  return user?.role?.trim().toLowerCase() === "admin";
}

export function hasScope(user: AppUser | null | undefined, scope: AppScope): boolean {
  if (isAdmin(user)) {
    return true;
  }
  if (!user?.scopes?.length) {
    return false;
  }
  return user.scopes.includes(scope);
}

export function getDefaultAppPath(user: AppUser | null | undefined): string {
  if (hasScope(user, APP_SCOPES.VIDEO_EDITOR_WRITE)) {
    return "/";
  }
  if (hasScope(user, APP_SCOPES.REMOVE_WATERMARK_WRITE)) {
    return "/watermark";
  }
  if (hasScope(user, APP_SCOPES.VIDEO_LOOP_WRITE)) {
    return "/loop";
  }
  return "/no-access";
}

export function isNavItemVisible(
  item: { requiredScope?: AppScope },
  user: AppUser | null | undefined,
): boolean {
  if (!item.requiredScope) {
    return true;
  }
  return hasScope(user, item.requiredScope);
}
