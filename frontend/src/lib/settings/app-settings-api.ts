import { mixRowsFromPayload } from "@/features/video-merge/mix-row-types";
import type { MixRow, MixRowPayload } from "@/features/video-merge/mix-row-types";
import {
  DEFAULT_EXPORT_SETTINGS,
  SCENE_TRANSITION_OPTIONS,
  type SceneTransitionEffect,
  type VideoMergeExportSettings,
} from "@/features/video-merge/video-merge-export-types";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import {
  isPywebviewApiReady,
  isPywebviewShell,
  waitForPywebviewReady,
} from "@/lib/pywebview/readiness";
import type {
  LoginSettings,
  RemoveWatermarkSettings,
  SaveLoginSettingsPayload,
  VideoMergeConfigSettings,
  VideoMergeSettings,
} from "@/lib/settings/app-settings-types";
import {
  getVideoMergeWorkspaceUserKey,
  loadVideoMergeWorkspace,
  migrateDefaultWorkspaceToUser,
  migrateWorkspaceFromSqliteMixRows,
  persistMixRowsToWorkspace,
} from "@/lib/settings/video-merge-workspace-storage";

const LOGIN_SETTINGS_STORAGE_KEY = "jos.settings.login";
const VIDEO_MERGE_CONFIG_STORAGE_KEY = "jos.settings.video-merge.config";
const REMOVE_WATERMARK_SETTINGS_STORAGE_KEY = "jos.settings.remove-watermark";
const LEGACY_VIDEO_MERGE_SETTINGS_STORAGE_KEY = "jos.settings.video-merge";
const LEGACY_LOGIN_STORAGE_KEY = "jos.auth.saved-credentials";

let loginCache: LoginSettings | null = null;
let videoMergeCache: VideoMergeSettings | null = null;
let removeWatermarkCache: RemoveWatermarkSettings | null = null;
let loginCacheFromBridge = false;
let videoMergeCacheFromBridge = false;
let removeWatermarkCacheFromBridge = false;
let preloadPromise: Promise<void> | null = null;

const BRIDGE_WAIT_MS = 15_000;

/** Wait until pywebview.api is callable (desktop), or time out (browser dev). */
async function ensureSettingsBackendReady(): Promise<boolean> {
  if (isPywebviewApiReady()) {
    return true;
  }
  if (!isPywebviewShell()) {
    return false;
  }
  try {
    await waitForPywebviewReady(BRIDGE_WAIT_MS);
  } catch {
    return false;
  }
  return isPywebviewApiReady();
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeSceneTransition(raw: string | undefined): SceneTransitionEffect {
  const value = raw?.trim().toLowerCase();
  if (SCENE_TRANSITION_OPTIONS.some((opt) => opt.value === value)) {
    return value as SceneTransitionEffect;
  }
  return DEFAULT_EXPORT_SETTINGS.sceneTransition;
}

function normalizeExportSettings(
  raw: Partial<VideoMergeExportSettings> | undefined,
): VideoMergeExportSettings {
  const merged = { ...DEFAULT_EXPORT_SETTINGS, ...raw };
  return {
    ...merged,
    sceneTransition: normalizeSceneTransition(merged.sceneTransition),
  };
}

function loadLoginFromLocalStorage(): LoginSettings {
  if (!canUseStorage()) {
    return { remember_account: false, username: "", password: "" };
  }
  try {
    const raw = localStorage.getItem(LOGIN_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { remember_account: false, username: "", password: "" };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { remember_account: false, username: "", password: "" };
    }
    const data = parsed as Partial<LoginSettings>;
    return {
      remember_account: Boolean(data.remember_account),
      username: typeof data.username === "string" ? data.username.trim() : "",
      password: typeof data.password === "string" ? data.password : "",
    };
  } catch {
    return { remember_account: false, username: "", password: "" };
  }
}

function saveLoginToLocalStorage(payload: SaveLoginSettingsPayload): LoginSettings {
  const next: LoginSettings = {
    remember_account: payload.remember_account,
    username: payload.remember_account ? payload.username.trim() : "",
    password: payload.remember_account ? payload.password : "",
  };
  if (canUseStorage()) {
    if (next.remember_account && next.username && next.password) {
      localStorage.setItem(LOGIN_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(LOGIN_SETTINGS_STORAGE_KEY);
    }
  }
  return next;
}

function loadVideoMergeConfigFromLocalStorage(): VideoMergeConfigSettings {
  if (!canUseStorage()) {
    return {
      input_folder: "",
      output_folder: "",
      export_settings: DEFAULT_EXPORT_SETTINGS,
    };
  }
  const readConfig = (raw: string | null): VideoMergeConfigSettings => {
    if (!raw) {
      return {
        input_folder: "",
        output_folder: "",
        export_settings: DEFAULT_EXPORT_SETTINGS,
      };
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) {
        return {
          input_folder: "",
          output_folder: "",
          export_settings: DEFAULT_EXPORT_SETTINGS,
        };
      }
      const data = parsed as Partial<VideoMergeSettings>;
      return {
        input_folder: typeof data.input_folder === "string" ? data.input_folder : "",
        output_folder: typeof data.output_folder === "string" ? data.output_folder : "",
        export_settings: normalizeExportSettings(data.export_settings),
      };
    } catch {
      return {
        input_folder: "",
        output_folder: "",
        export_settings: DEFAULT_EXPORT_SETTINGS,
      };
    }
  };

  const configRaw = localStorage.getItem(VIDEO_MERGE_CONFIG_STORAGE_KEY);
  if (configRaw) {
    return readConfig(configRaw);
  }
  return readConfig(localStorage.getItem(LEGACY_VIDEO_MERGE_SETTINGS_STORAGE_KEY));
}

function saveVideoMergeConfigToLocalStorage(
  settings: VideoMergeConfigSettings,
): VideoMergeConfigSettings {
  const next: VideoMergeConfigSettings = {
    input_folder: settings.input_folder.trim(),
    output_folder: settings.output_folder.trim(),
    export_settings: normalizeExportSettings(settings.export_settings),
  };
  if (canUseStorage()) {
    localStorage.setItem(VIDEO_MERGE_CONFIG_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

function normalizeThreadCount(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 4;
  }
  return Math.max(1, Math.min(32, Math.floor(parsed)));
}

function normalizeLogoZoomPercent(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 4.0;
  }
  return Math.max(1.0, Math.min(30.0, parsed));
}

function loadRemoveWatermarkFromLocalStorage(): RemoveWatermarkSettings {
  if (!canUseStorage()) {
    return { input_folder: "", output_folder: "", thread_count: 4, zoom_percent: 4.0 };
  }
  try {
    const raw = localStorage.getItem(REMOVE_WATERMARK_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { input_folder: "", output_folder: "", thread_count: 4, zoom_percent: 4.0 };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return { input_folder: "", output_folder: "", thread_count: 4, zoom_percent: 4.0 };
    }
    const data = parsed as Partial<RemoveWatermarkSettings>;
    return {
      input_folder: typeof data.input_folder === "string" ? data.input_folder : "",
      output_folder: typeof data.output_folder === "string" ? data.output_folder : "",
      thread_count: normalizeThreadCount(data.thread_count),
      zoom_percent: normalizeLogoZoomPercent(data.zoom_percent),
    };
  } catch {
    return { input_folder: "", output_folder: "", thread_count: 4, zoom_percent: 4.0 };
  }
}

function saveRemoveWatermarkToLocalStorage(
  settings: RemoveWatermarkSettings,
): RemoveWatermarkSettings {
  const next: RemoveWatermarkSettings = {
    input_folder: settings.input_folder.trim(),
    output_folder: settings.output_folder.trim(),
    thread_count: normalizeThreadCount(settings.thread_count),
    zoom_percent: normalizeLogoZoomPercent(settings.zoom_percent),
  };
  if (canUseStorage()) {
    localStorage.setItem(REMOVE_WATERMARK_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

function mergeVideoMergeFolderPaths(
  incoming: VideoMergeConfigSettings,
  existing: Pick<VideoMergeConfigSettings, "input_folder" | "output_folder">,
): Pick<VideoMergeConfigSettings, "input_folder" | "output_folder"> {
  return {
    input_folder: incoming.input_folder.trim() || existing.input_folder.trim(),
    output_folder: incoming.output_folder.trim() || existing.output_folder.trim(),
  };
}

async function readExistingVideoMergeFolders(): Promise<
  Pick<VideoMergeConfigSettings, "input_folder" | "output_folder">
> {
  if (await useSettingsBridge()) {
    const client = await createBridgeClient();
    const result = await client.getVideoMergeSettings();
    return {
      input_folder: result.input_folder?.trim() ?? "",
      output_folder: result.output_folder?.trim() ?? "",
    };
  }
  const local = loadVideoMergeConfigFromLocalStorage();
  return {
    input_folder: local.input_folder.trim(),
    output_folder: local.output_folder.trim(),
  };
}

/** Local fallback when SQLite/bridge hydrate fails (browser dev or transient errors). */
export function readVideoMergeConfigLocalFallback(): VideoMergeConfigSettings {
  return loadVideoMergeConfigFromLocalStorage();
}

function mergeVideoMergeSettings(
  config: VideoMergeConfigSettings,
  mixRows: MixRowPayload[] | undefined,
): VideoMergeSettings {
  return {
    ...config,
    mix_rows: mixRows ?? [],
  };
}

async function useSettingsBridge(): Promise<boolean> {
  return ensureSettingsBackendReady();
}

async function readLoginSettingsFromBackend(): Promise<LoginSettings> {
  if (!(await useSettingsBridge())) {
    return loadLoginFromLocalStorage();
  }
  const client = await createBridgeClient();
  const result = await client.getLoginSettings();
  return {
    remember_account: Boolean(result.remember_account),
    username: result.username?.trim() ?? "",
    password: result.password ?? "",
  };
}

async function readVideoMergeConfigFromBackend(): Promise<VideoMergeConfigSettings> {
  if (!(await useSettingsBridge())) {
    return loadVideoMergeConfigFromLocalStorage();
  }
  const client = await createBridgeClient();
  const result = await client.getVideoMergeSettings();
  const config: VideoMergeConfigSettings = {
    input_folder: result.input_folder ?? "",
    output_folder: result.output_folder ?? "",
    export_settings: normalizeExportSettings(result.export_settings),
  };
  migrateWorkspaceFromSqliteMixRows(result.mix_rows);
  return config;
}

async function readRemoveWatermarkFromBackend(): Promise<RemoveWatermarkSettings> {
  if (!(await useSettingsBridge())) {
    return loadRemoveWatermarkFromLocalStorage();
  }
  const client = await createBridgeClient();
  const result = await client.getRemoveWatermarkSettings();
  return {
    input_folder: result.input_folder?.trim() ?? "",
    output_folder: result.output_folder?.trim() ?? "",
    thread_count: normalizeThreadCount(result.thread_count),
    zoom_percent: normalizeLogoZoomPercent(result.zoom_percent),
  };
}

function resolveWorkspaceUserKey(userKey?: string): string {
  return (userKey?.trim() || getVideoMergeWorkspaceUserKey()).trim() || "default";
}

async function readVideoMergeConfigResolved(): Promise<VideoMergeConfigSettings> {
  if (!isPywebviewShell() && !isPywebviewApiReady()) {
    return loadVideoMergeConfigFromLocalStorage();
  }
  const bridge = await ensureSettingsBackendReady();
  if (!bridge) {
    return loadVideoMergeConfigFromLocalStorage();
  }
  if (videoMergeCache && videoMergeCacheFromBridge) {
    return {
      input_folder: videoMergeCache.input_folder,
      output_folder: videoMergeCache.output_folder,
      export_settings: videoMergeCache.export_settings,
    };
  }
  return readVideoMergeConfigFromBackend();
}

async function readRemoveWatermarkResolved(): Promise<RemoveWatermarkSettings> {
  if (!isPywebviewShell() && !isPywebviewApiReady()) {
    return loadRemoveWatermarkFromLocalStorage();
  }
  const bridge = await ensureSettingsBackendReady();
  if (!bridge) {
    return loadRemoveWatermarkFromLocalStorage();
  }
  if (removeWatermarkCache && removeWatermarkCacheFromBridge) {
    return removeWatermarkCache;
  }
  return readRemoveWatermarkFromBackend();
}

export function mixRowsFromSettings(settings: VideoMergeSettings): MixRow[] {
  return mixRowsFromPayload(settings.mix_rows);
}

/** @internal Vitest only — clears in-memory cache between tests. */
export function resetSettingsCacheForTests(): void {
  loginCache = null;
  videoMergeCache = null;
  removeWatermarkCache = null;
  loginCacheFromBridge = false;
  videoMergeCacheFromBridge = false;
  removeWatermarkCacheFromBridge = false;
  preloadPromise = null;
}

/** Preload SQLite settings after pywebview bridge is ready (call once at app start). */
export function preloadAppSettings(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = (async () => {
      const bridge = await ensureSettingsBackendReady();
      await migrateLegacyLoginFromLocalStorage();
      if (bridge) {
        const [login, config, watermark] = await Promise.all([
          readLoginSettingsFromBackend(),
          readVideoMergeConfigFromBackend(),
          readRemoveWatermarkFromBackend(),
        ]);
        loginCache = login;
        const workspaceKey = resolveWorkspaceUserKey();
        migrateDefaultWorkspaceToUser(workspaceKey);
        const workspace = loadVideoMergeWorkspace(workspaceKey);
        videoMergeCache = mergeVideoMergeSettings(config, workspace.mix_rows);
        removeWatermarkCache = watermark;
        loginCacheFromBridge = true;
        videoMergeCacheFromBridge = true;
        removeWatermarkCacheFromBridge = true;
        return;
      }
      loginCache = loadLoginFromLocalStorage();
      const workspaceKey = resolveWorkspaceUserKey();
      migrateDefaultWorkspaceToUser(workspaceKey);
      videoMergeCache = mergeVideoMergeSettings(
        loadVideoMergeConfigFromLocalStorage(),
        loadVideoMergeWorkspace(workspaceKey).mix_rows,
      );
      removeWatermarkCache = loadRemoveWatermarkFromLocalStorage();
      loginCacheFromBridge = false;
      videoMergeCacheFromBridge = false;
      removeWatermarkCacheFromBridge = false;
    })().catch((err) => {
      preloadPromise = null;
      throw err;
    });
  }
  return preloadPromise;
}

export async function fetchLoginSettings(): Promise<LoginSettings> {
  if (!isPywebviewShell() && !isPywebviewApiReady()) {
    if (loginCache) {
      return loginCache;
    }
    return loadLoginFromLocalStorage();
  }
  const bridge = await ensureSettingsBackendReady();
  if (bridge) {
    if (loginCache && loginCacheFromBridge) {
      return loginCache;
    }
    const settings = await readLoginSettingsFromBackend();
    loginCache = settings;
    loginCacheFromBridge = true;
    return settings;
  }
  if (loginCache) {
    return loginCache;
  }
  return loadLoginFromLocalStorage();
}

export async function persistLoginSettings(
  payload: SaveLoginSettingsPayload,
): Promise<LoginSettings> {
  if (!isPywebviewShell()) {
    return saveLoginToLocalStorage(payload);
  }
  const bridge = await ensureSettingsBackendReady();
  if (!bridge) {
    return saveLoginToLocalStorage(payload);
  }
  const client = await createBridgeClient();
  const result = await client.saveLoginSettings(
    payload.remember_account,
    payload.username,
    payload.password,
  );
  const settings: LoginSettings = {
    remember_account: Boolean(result.remember_account),
    username: result.username?.trim() ?? "",
    password: result.password ?? "",
  };
  loginCache = settings;
  loginCacheFromBridge = true;
  return settings;
}

export function invalidateVideoMergeSettingsCache(): void {
  videoMergeCache = null;
  videoMergeCacheFromBridge = false;
  preloadPromise = null;
}

export async function fetchVideoMergeSettings(userKey?: string): Promise<VideoMergeSettings> {
  const workspaceKey = resolveWorkspaceUserKey(userKey);
  migrateDefaultWorkspaceToUser(workspaceKey);
  const config = await readVideoMergeConfigResolved();
  const workspace = loadVideoMergeWorkspace(workspaceKey);
  const merged = mergeVideoMergeSettings(config, workspace.mix_rows);
  videoMergeCache = merged;
  return merged;
}

/** One-time migration from pre-SQLite localStorage login key. */
export async function migrateLegacyLoginFromLocalStorage(): Promise<void> {
  if (!canUseStorage()) {
    return;
  }
  const current = await readLoginSettingsFromBackend();
  if (current.username || current.password) {
    loginCache = current;
    return;
  }
  try {
    const raw = localStorage.getItem(LEGACY_LOGIN_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      localStorage.removeItem(LEGACY_LOGIN_STORAGE_KEY);
      return;
    }
    const data = parsed as { username?: string; password?: string };
    const username = typeof data.username === "string" ? data.username.trim() : "";
    const password = typeof data.password === "string" ? data.password : "";
    if (!username || !password) {
      localStorage.removeItem(LEGACY_LOGIN_STORAGE_KEY);
      return;
    }
    await persistLoginSettings({
      remember_account: true,
      username,
      password,
    });
    localStorage.removeItem(LEGACY_LOGIN_STORAGE_KEY);
  } catch {
    localStorage.removeItem(LEGACY_LOGIN_STORAGE_KEY);
  }
}

export async function persistVideoMergeConfig(
  config: VideoMergeConfigSettings,
): Promise<VideoMergeConfigSettings> {
  const existingFolders = await readExistingVideoMergeFolders();
  const mergedFolders = mergeVideoMergeFolderPaths(config, existingFolders);
  const payload: VideoMergeConfigSettings = {
    input_folder: mergedFolders.input_folder,
    output_folder: mergedFolders.output_folder,
    export_settings: normalizeExportSettings(config.export_settings),
  };

  if (!isPywebviewShell()) {
    return saveVideoMergeConfigToLocalStorage(payload);
  }

  const bridge = await ensureSettingsBackendReady();
  if (!bridge) {
    return saveVideoMergeConfigToLocalStorage(payload);
  }

  const client = await createBridgeClient();
  const result = await client.saveVideoMergeSettings(
    payload.input_folder,
    payload.output_folder,
    payload.export_settings,
  );
  const next: VideoMergeConfigSettings = {
    input_folder: result.input_folder ?? "",
    output_folder: result.output_folder ?? "",
    export_settings: normalizeExportSettings(result.export_settings),
  };
  if (videoMergeCache) {
    videoMergeCache = mergeVideoMergeSettings(next, videoMergeCache.mix_rows);
  }
  videoMergeCacheFromBridge = true;
  return next;
}

export async function persistVideoMergeWorkspace(
  mixRows: MixRowPayload[],
  userKey?: string,
  selectedMixRowId?: string | null,
): Promise<void> {
  const workspaceKey = resolveWorkspaceUserKey(userKey);
  persistMixRowsToWorkspace(mixRows, workspaceKey, selectedMixRowId);
  if (videoMergeCache) {
    videoMergeCache = { ...videoMergeCache, mix_rows: mixRows };
  }

  if (!isPywebviewShell() && !isPywebviewApiReady()) {
    return;
  }
  const bridge = await ensureSettingsBackendReady();
  if (!bridge) {
    return;
  }
  const config = videoMergeCache ?? (await readVideoMergeConfigResolved());
  const mergedFolders = mergeVideoMergeFolderPaths(
    config,
    await readExistingVideoMergeFolders(),
  );
  const client = await createBridgeClient();
  await client.saveVideoMergeSettings(
    mergedFolders.input_folder,
    mergedFolders.output_folder,
    config.export_settings,
    mixRows,
  );
}

export async function persistVideoMergeSettings(
  settings: VideoMergeSettings,
): Promise<VideoMergeSettings> {
  const config: VideoMergeConfigSettings = {
    input_folder: settings.input_folder,
    output_folder: settings.output_folder,
    export_settings: settings.export_settings,
  };
  const mixRows = settings.mix_rows ?? [];
  await persistVideoMergeConfig(config);
  await persistVideoMergeWorkspace(mixRows);
  const next = mergeVideoMergeSettings(config, mixRows);
  videoMergeCache = next;
  return next;
}

export function invalidateRemoveWatermarkSettingsCache(): void {
  removeWatermarkCache = null;
  removeWatermarkCacheFromBridge = false;
}

export async function fetchRemoveWatermarkSettings(): Promise<RemoveWatermarkSettings> {
  if (!isPywebviewShell() && !isPywebviewApiReady()) {
    if (removeWatermarkCache) {
      return removeWatermarkCache;
    }
    return loadRemoveWatermarkFromLocalStorage();
  }
  const bridge = await ensureSettingsBackendReady();
  if (bridge) {
    const settings = await readRemoveWatermarkResolved();
    removeWatermarkCache = settings;
    removeWatermarkCacheFromBridge = true;
    return settings;
  }
  if (removeWatermarkCache) {
    return removeWatermarkCache;
  }
  return loadRemoveWatermarkFromLocalStorage();
}

export async function persistRemoveWatermarkSettings(
  settings: RemoveWatermarkSettings,
): Promise<RemoveWatermarkSettings> {
  const payload: RemoveWatermarkSettings = {
    input_folder: settings.input_folder.trim(),
    output_folder: settings.output_folder.trim(),
    thread_count: normalizeThreadCount(settings.thread_count),
    zoom_percent: normalizeLogoZoomPercent(settings.zoom_percent),
  };

  if (!isPywebviewShell()) {
    const saved = saveRemoveWatermarkToLocalStorage(payload);
    removeWatermarkCache = saved;
    removeWatermarkCacheFromBridge = false;
    return saved;
  }

  const bridge = await ensureSettingsBackendReady();
  if (!bridge) {
    const saved = saveRemoveWatermarkToLocalStorage(payload);
    removeWatermarkCache = saved;
    removeWatermarkCacheFromBridge = false;
    return saved;
  }

  const client = await createBridgeClient();
  const result = await client.saveRemoveWatermarkSettings(
    payload.input_folder,
    payload.output_folder,
    payload.thread_count,
    payload.zoom_percent,
  );
  const next: RemoveWatermarkSettings = {
    input_folder: result.input_folder?.trim() ?? "",
    output_folder: result.output_folder?.trim() ?? "",
    thread_count: normalizeThreadCount(result.thread_count),
    zoom_percent: normalizeLogoZoomPercent(result.zoom_percent),
  };
  removeWatermarkCache = next;
  removeWatermarkCacheFromBridge = true;
  return next;
}

