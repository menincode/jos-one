import {
  mixRowsFromPayload,
  mixRowsToPayload,
  type MixRowPayload,
} from "@/features/video-merge/mix-row-types";
import type { VideoFileItem } from "@/lib/pywebview/types";

const WORKSPACE_STORAGE_PREFIX = "jos.settings.video-merge.workspace.v1";
const LEGACY_VIDEO_MERGE_KEY = "jos.settings.video-merge";
const AUTH_USER_KEY = "jos.auth.user";

export interface VideoMergeWorkspaceData {
  mix_rows: MixRowPayload[];
  videos_by_folder: Record<string, VideoFileItem[]>;
}

const EMPTY_WORKSPACE: VideoMergeWorkspaceData = {
  mix_rows: [],
  videos_by_folder: {},
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Scope workspace per logged-in user so re-login restores the right mix/video cache. */
export function getVideoMergeWorkspaceUserKey(): string {
  if (!canUseStorage()) {
    return "default";
  }
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) {
      return "default";
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return "default";
    }
    const data = parsed as { id?: number | string; username?: string };
    if (data.id != null && String(data.id).trim()) {
      return String(data.id).trim();
    }
    if (typeof data.username === "string" && data.username.trim()) {
      return data.username.trim();
    }
  } catch {
    return "default";
  }
  return "default";
}

function storageKey(userKey?: string): string {
  const scoped = (userKey ?? getVideoMergeWorkspaceUserKey()).trim() || "default";
  return `${WORKSPACE_STORAGE_PREFIX}.${scoped}`;
}

function normalizeVideos(raw: unknown): VideoFileItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const items: VideoFileItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const row = entry as Partial<VideoFileItem>;
    const path = typeof row.path === "string" ? row.path.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!path || !name) {
      continue;
    }
    const size =
      typeof row.size_bytes === "number" && Number.isFinite(row.size_bytes)
        ? row.size_bytes
        : 0;
    const duration =
      row.duration_sec == null
        ? null
        : typeof row.duration_sec === "number" && Number.isFinite(row.duration_sec)
          ? row.duration_sec
          : null;
    items.push({ name, path, size_bytes: size, duration_sec: duration });
  }
  return items;
}

function normalizeWorkspace(raw: unknown): VideoMergeWorkspaceData {
  if (typeof raw !== "object" || raw === null) {
    return { ...EMPTY_WORKSPACE };
  }
  const data = raw as Partial<VideoMergeWorkspaceData>;
  const videosByFolder: Record<string, VideoFileItem[]> = {};
  if (data.videos_by_folder && typeof data.videos_by_folder === "object") {
    for (const [folder, list] of Object.entries(data.videos_by_folder)) {
      const key = folder.trim();
      if (!key) {
        continue;
      }
      videosByFolder[key] = normalizeVideos(list);
    }
  }
  return {
    mix_rows: mixRowsToPayload(mixRowsFromPayload(data.mix_rows as MixRowPayload[] | undefined)),
    videos_by_folder: videosByFolder,
  };
}

function readLegacyWorkspace(): VideoMergeWorkspaceData | null {
  if (!canUseStorage()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(LEGACY_VIDEO_MERGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const data = parsed as {
      mix_rows?: MixRowPayload[];
      videos_by_folder?: Record<string, VideoFileItem[]>;
    };
    const hasMix = Array.isArray(data.mix_rows) && data.mix_rows.length > 0;
    const hasVideos =
      data.videos_by_folder != null && Object.keys(data.videos_by_folder).length > 0;
    if (!hasMix && !hasVideos) {
      return null;
    }
    return normalizeWorkspace({
      mix_rows: data.mix_rows ?? [],
      videos_by_folder: data.videos_by_folder ?? {},
    });
  } catch {
    return null;
  }
}

export function loadVideoMergeWorkspace(userKey?: string): VideoMergeWorkspaceData {
  if (!canUseStorage()) {
    return { ...EMPTY_WORKSPACE };
  }
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) {
      const legacy = readLegacyWorkspace();
      if (legacy) {
        saveVideoMergeWorkspace(legacy, userKey);
        return legacy;
      }
      return { ...EMPTY_WORKSPACE };
    }
    return normalizeWorkspace(JSON.parse(raw));
  } catch {
    return { ...EMPTY_WORKSPACE };
  }
}

export function saveVideoMergeWorkspace(
  workspace: VideoMergeWorkspaceData,
  userKey?: string,
): VideoMergeWorkspaceData {
  const next = normalizeWorkspace(workspace);
  if (canUseStorage()) {
    localStorage.setItem(storageKey(userKey), JSON.stringify(next));
  }
  return next;
}

export function loadFolderVideosFromWorkspace(
  inputFolder: string,
  userKey?: string,
): VideoFileItem[] | null {
  const folder = inputFolder.trim();
  if (!folder) {
    return null;
  }
  const cached = loadVideoMergeWorkspace(userKey).videos_by_folder[folder];
  return cached?.length ? cached : null;
}

export function persistFolderVideosToWorkspace(
  inputFolder: string,
  videos: VideoFileItem[],
  mixRows?: MixRowPayload[],
  userKey?: string,
): VideoMergeWorkspaceData {
  const folder = inputFolder.trim();
  const current = loadVideoMergeWorkspace(userKey);
  const next: VideoMergeWorkspaceData = {
    mix_rows: mixRows ?? current.mix_rows,
    videos_by_folder: { ...current.videos_by_folder },
  };
  if (folder) {
    next.videos_by_folder[folder] = normalizeVideos(videos);
  }
  return saveVideoMergeWorkspace(next, userKey);
}

export function persistMixRowsToWorkspace(
  mixRows: MixRowPayload[],
  userKey?: string,
): VideoMergeWorkspaceData {
  const current = loadVideoMergeWorkspace(userKey);
  return saveVideoMergeWorkspace({ ...current, mix_rows: mixRows }, userKey);
}

/** Pull mix_rows from SQLite payload into localStorage and stop relying on DB for workspace. */
/** Copy workspace saved under `default` before sign-in into the authenticated user key. */
export function migrateDefaultWorkspaceToUser(userKey: string): void {
  const scoped = userKey.trim() || "default";
  if (scoped === "default") {
    return;
  }
  const current = loadVideoMergeWorkspace(scoped);
  if (current.mix_rows.length > 0 || Object.keys(current.videos_by_folder).length > 0) {
    return;
  }
  const fallback = loadVideoMergeWorkspace("default");
  if (fallback.mix_rows.length === 0 && Object.keys(fallback.videos_by_folder).length === 0) {
    return;
  }
  saveVideoMergeWorkspace(fallback, scoped);
}

export function migrateWorkspaceFromSqliteMixRows(
  mixRows: MixRowPayload[] | undefined,
  userKey?: string,
): void {
  if (!mixRows?.length) {
    return;
  }
  const current = loadVideoMergeWorkspace(userKey);
  if (current.mix_rows.length > 0) {
    return;
  }
  saveVideoMergeWorkspace(
    { ...current, mix_rows: mixRowsToPayload(mixRowsFromPayload(mixRows)) },
    userKey,
  );
}
