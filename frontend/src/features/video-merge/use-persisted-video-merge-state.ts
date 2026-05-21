import { useCallback, useEffect, useRef, useState } from "react";

import {
  createEmptyMixRow,
  mixRowsToPayload,
  type MixRow,
} from "@/features/video-merge/mix-row-types";
import {
  DEFAULT_EXPORT_SETTINGS,
  type VideoMergeExportSettings,
} from "@/features/video-merge/video-merge-export-types";
import {
  fetchVideoMergeSettings,
  mixRowsFromSettings,
  persistVideoMergeConfig,
  persistVideoMergeWorkspace,
  preloadAppSettings,
} from "@/lib/settings/app-settings-api";
import type { VideoMergeConfigSettings } from "@/lib/settings/app-settings-types";
import { usePywebviewReady } from "@/lib/pywebview";
import { useAuthStore } from "@/stores/auth-store";

const CONFIG_SAVE_DEBOUNCE_MS = 400;

function buildConfigSnapshot(
  inputFolder: string,
  outputFolder: string,
  exportSettings: VideoMergeExportSettings,
): VideoMergeConfigSettings {
  return {
    input_folder: inputFolder,
    output_folder: outputFolder,
    export_settings: exportSettings,
  };
}

function resolveWorkspaceUserKey(
  authUser: { id: number; username: string } | null,
): string {
  if (authUser?.id != null) {
    return String(authUser.id);
  }
  if (authUser?.username?.trim()) {
    return authUser.username.trim();
  }
  return "default";
}

export function usePersistedVideoMergeState() {
  const { ready: bridgeReady, isDesktop } = usePywebviewReady();
  const canLoadFromStore = !isDesktop || bridgeReady;
  const authUser = useAuthStore((state) => state.user);
  const workspaceUserKey = resolveWorkspaceUserKey(authUser);

  const [inputFolder, setInputFolder] = useState("");
  const [outputFolder, setOutputFolder] = useState("");
  const [exportSettings, setExportSettings] =
    useState<VideoMergeExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [mixRows, setMixRows] = useState<MixRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const configSaveTimerRef = useRef<number | null>(null);
  const skipSaveRef = useRef(true);
  const latestConfigRef = useRef(buildConfigSnapshot("", "", DEFAULT_EXPORT_SETTINGS));
  const latestMixRowsRef = useRef<MixRow[]>([]);
  const workspaceUserKeyRef = useRef(workspaceUserKey);

  workspaceUserKeyRef.current = workspaceUserKey;
  latestConfigRef.current = buildConfigSnapshot(inputFolder, outputFolder, exportSettings);
  latestMixRowsRef.current = mixRows;

  const persistConfigNow = useCallback(async (config?: VideoMergeConfigSettings) => {
    await persistVideoMergeConfig(config ?? latestConfigRef.current);
  }, []);

  const persistMixRowsNow = useCallback(async (rows?: MixRow[]) => {
    await persistVideoMergeWorkspace(
      mixRowsToPayload(rows ?? latestMixRowsRef.current),
      workspaceUserKeyRef.current,
    );
  }, []);

  const scheduleConfigSave = useCallback(() => {
    if (skipSaveRef.current) {
      return;
    }
    if (configSaveTimerRef.current !== null) {
      window.clearTimeout(configSaveTimerRef.current);
    }
    configSaveTimerRef.current = window.setTimeout(() => {
      configSaveTimerRef.current = null;
      void persistConfigNow();
    }, CONFIG_SAVE_DEBOUNCE_MS);
  }, [persistConfigNow]);

  useEffect(() => {
    if (!canLoadFromStore) {
      return;
    }

    let cancelled = false;
    skipSaveRef.current = true;
    setHydrated(false);

    void (async () => {
      try {
        await preloadAppSettings();
        const saved = await fetchVideoMergeSettings(workspaceUserKey);
        if (cancelled) {
          return;
        }
        setInputFolder(saved.input_folder);
        setOutputFolder(saved.output_folder);
        setExportSettings(saved.export_settings);
        setMixRows(mixRowsFromSettings(saved));
      } catch {
        if (!cancelled) {
          setInputFolder("");
          setOutputFolder("");
          setExportSettings(DEFAULT_EXPORT_SETTINGS);
          setMixRows([]);
        }
      } finally {
        if (!cancelled) {
          skipSaveRef.current = false;
          setHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (configSaveTimerRef.current !== null) {
        window.clearTimeout(configSaveTimerRef.current);
        configSaveTimerRef.current = null;
      }
      if (!skipSaveRef.current) {
        void persistConfigNow();
        void persistMixRowsNow();
      }
    };
  }, [canLoadFromStore, workspaceUserKey, persistConfigNow, persistMixRowsNow]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    scheduleConfigSave();
    return () => {
      if (configSaveTimerRef.current !== null) {
        window.clearTimeout(configSaveTimerRef.current);
      }
    };
  }, [hydrated, inputFolder, outputFolder, exportSettings, scheduleConfigSave]);

  useEffect(() => {
    if (!hydrated || skipSaveRef.current) {
      return;
    }
    void persistMixRowsNow(mixRows);
  }, [hydrated, mixRows, workspaceUserKey, persistMixRowsNow]);

  const patchExportSettings = useCallback(
    (patch: Partial<VideoMergeExportSettings>, options?: { immediate?: boolean }) => {
      const nextExport = { ...exportSettings, ...patch };
      setExportSettings(nextExport);
      if (options?.immediate) {
        void persistConfigNow(
          buildConfigSnapshot(inputFolder, outputFolder, nextExport),
        );
      }
    },
    [inputFolder, outputFolder, exportSettings, persistConfigNow],
  );

  const setInputFolderPersisted = useCallback(
    (value: string, options?: { immediate?: boolean }) => {
      setInputFolder(value);
      if (options?.immediate) {
        void persistConfigNow(buildConfigSnapshot(value, outputFolder, exportSettings));
      }
    },
    [outputFolder, exportSettings, persistConfigNow],
  );

  const setOutputFolderPersisted = useCallback(
    (value: string, options?: { immediate?: boolean }) => {
      setOutputFolder(value);
      if (options?.immediate) {
        void persistConfigNow(buildConfigSnapshot(inputFolder, value, exportSettings));
      }
    },
    [inputFolder, exportSettings, persistConfigNow],
  );

  const addMixRow = useCallback(() => {
    setMixRows((prev) => [...prev, createEmptyMixRow()]);
  }, []);

  const removeMixRow = useCallback((rowId: string) => {
    setMixRows((prev) => prev.filter((row) => row.id !== rowId));
  }, []);

  const clearAllMixRows = useCallback(() => {
    setMixRows([]);
  }, []);

  const toggleMixRowLeadingVideo = useCallback((rowId: string, path: string) => {
    setMixRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) {
          return row;
        }
        const has = row.leadingPaths.includes(path);
        if (has) {
          return {
            ...row,
            leadingPaths: row.leadingPaths.filter((p) => p !== path),
          };
        }
        return { ...row, leadingPaths: [...row.leadingPaths, path] };
      }),
    );
  }, []);

  return {
    hydrated,
    settingsLoading: isDesktop && !hydrated,
    inputFolder,
    outputFolder,
    exportSettings,
    mixRows,
    setInputFolder: setInputFolderPersisted,
    setOutputFolder: setOutputFolderPersisted,
    patchExportSettings,
    addMixRow,
    removeMixRow,
    clearAllMixRows,
    toggleMixRowLeadingVideo,
  };
}
