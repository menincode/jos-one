import { useCallback, useEffect, useRef, useState } from "react";

import {
  createEmptyMixRow,
  mixRowsFromPayload,
  mixRowsToPayload,
  type MixRow,
} from "@/features/video-merge/mix-row-types";
import {
  loadMixWorkspaceState,
  resolveMixWorkspaceUserKey,
  resolveSelectedMixRowId,
  saveMixWorkspaceState,
} from "@/features/video-merge/mix-workspace-persist";
import {
  DEFAULT_EXPORT_SETTINGS,
  type VideoMergeExportSettings,
} from "@/features/video-merge/video-merge-export-types";
import {
  fetchVideoMergeSettings,
  persistVideoMergeConfig,
  persistVideoMergeWorkspace,
  preloadAppSettings,
} from "@/lib/settings/app-settings-api";
import type { VideoMergeConfigSettings } from "@/lib/settings/app-settings-types";
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

export function usePersistedVideoMergeState() {
  const authLoading = useAuthStore((state) => state.isLoading);
  const canLoadFromStore = !authLoading;
  const authUser = useAuthStore((state) => state.user);
  const workspaceUserKey = resolveMixWorkspaceUserKey(authUser);

  const [inputFolder, setInputFolder] = useState("");
  const [outputFolder, setOutputFolder] = useState("");
  const [exportSettings, setExportSettings] =
    useState<VideoMergeExportSettings>(DEFAULT_EXPORT_SETTINGS);
  const [mixRows, setMixRows] = useState<MixRow[]>([]);
  const [selectedMixRowId, setSelectedMixRowId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const configSaveTimerRef = useRef<number | null>(null);
  const mixBackendSaveTimerRef = useRef<number | null>(null);
  const skipMixSaveRef = useRef(true);
  const latestConfigRef = useRef(buildConfigSnapshot("", "", DEFAULT_EXPORT_SETTINGS));
  const latestMixRowsRef = useRef<MixRow[]>([]);
  const latestSelectedMixRowIdRef = useRef<string | null>(null);
  const workspaceUserKeyRef = useRef(workspaceUserKey);
  const prevWorkspaceUserKeyRef = useRef(workspaceUserKey);

  workspaceUserKeyRef.current = workspaceUserKey;
  latestConfigRef.current = buildConfigSnapshot(inputFolder, outputFolder, exportSettings);
  latestMixRowsRef.current = mixRows;
  latestSelectedMixRowIdRef.current = selectedMixRowId;

  const persistConfigNow = useCallback(async (config?: VideoMergeConfigSettings) => {
    await persistVideoMergeConfig(config ?? latestConfigRef.current);
  }, []);

  const flushMixBackendSave = useCallback(() => {
    if (skipMixSaveRef.current) {
      return;
    }
    void persistVideoMergeWorkspace(
      mixRowsToPayload(latestMixRowsRef.current),
      workspaceUserKeyRef.current,
      latestSelectedMixRowIdRef.current,
    );
  }, []);

  const scheduleMixBackendSave = useCallback(() => {
    if (skipMixSaveRef.current) {
      return;
    }
    if (mixBackendSaveTimerRef.current !== null) {
      window.clearTimeout(mixBackendSaveTimerRef.current);
    }
    mixBackendSaveTimerRef.current = window.setTimeout(() => {
      mixBackendSaveTimerRef.current = null;
      flushMixBackendSave();
    }, CONFIG_SAVE_DEBOUNCE_MS);
  }, [flushMixBackendSave]);

  const persistMixNow = useCallback(
    (rows?: MixRow[], rowId?: string | null) => {
      const nextRows = rows ?? latestMixRowsRef.current;
      const nextRowId =
        rowId !== undefined ? rowId : latestSelectedMixRowIdRef.current;
      // Always write localStorage so mix survives re-hydrate / workspace key changes.
      saveMixWorkspaceState(nextRows, nextRowId, workspaceUserKeyRef.current);
      if (skipMixSaveRef.current) {
        return;
      }
      scheduleMixBackendSave();
    },
    [scheduleMixBackendSave],
  );

  const applyMixState = useCallback(
    (rows: MixRow[], rowId: string | null, options?: { persist?: boolean }) => {
      setMixRows(rows);
      setSelectedMixRowId(rowId);
      latestMixRowsRef.current = rows;
      latestSelectedMixRowIdRef.current = rowId;
      if (options?.persist) {
        persistMixNow(rows, rowId);
      }
    },
    [persistMixNow],
  );

  const scheduleConfigSave = useCallback(() => {
    if (!hydrated) {
      return;
    }
    if (configSaveTimerRef.current !== null) {
      window.clearTimeout(configSaveTimerRef.current);
    }
    configSaveTimerRef.current = window.setTimeout(() => {
      configSaveTimerRef.current = null;
      void persistConfigNow();
    }, CONFIG_SAVE_DEBOUNCE_MS);
  }, [hydrated, persistConfigNow]);

  useEffect(() => {
    if (!canLoadFromStore) {
      return;
    }

    let cancelled = false;
    const workspaceKeyChanged = prevWorkspaceUserKeyRef.current !== workspaceUserKey;
    prevWorkspaceUserKeyRef.current = workspaceUserKey;
    skipMixSaveRef.current = true;
    if (!workspaceKeyChanged) {
      setHydrated(false);
    }

    const restored = loadMixWorkspaceState(workspaceUserKey);
    setMixRows(restored.rows);
    setSelectedMixRowId(restored.selectedMixRowId);
    latestMixRowsRef.current = restored.rows;
    latestSelectedMixRowIdRef.current = restored.selectedMixRowId;

    void (async () => {
      try {
        await preloadAppSettings();
        const saved = await fetchVideoMergeSettings(workspaceUserKey);
        if (cancelled) {
          return;
        }
        const freshMix = loadMixWorkspaceState(workspaceUserKey);
        const fromPersisted =
          freshMix.rows.length > 0
            ? freshMix.rows
            : mixRowsFromPayload(saved.mix_rows);
        // Keep mix rows added in-memory while settings hydrate (avoid wiping new mixes).
        const inMemoryRows = latestMixRowsRef.current;
        const mergedRows =
          inMemoryRows.length >= fromPersisted.length ? inMemoryRows : fromPersisted;
        setInputFolder(saved.input_folder);
        setOutputFolder(saved.output_folder);
        setExportSettings(saved.export_settings);
        setMixRows(mergedRows);
        setSelectedMixRowId(
          resolveSelectedMixRowId(mergedRows, freshMix.selectedMixRowId),
        );
        latestMixRowsRef.current = mergedRows;
        latestSelectedMixRowIdRef.current = resolveSelectedMixRowId(
          mergedRows,
          freshMix.selectedMixRowId,
        );
      } catch {
        if (!cancelled) {
          setInputFolder("");
          setOutputFolder("");
          setExportSettings(DEFAULT_EXPORT_SETTINGS);
        }
      } finally {
        if (!cancelled) {
          skipMixSaveRef.current = false;
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
      if (mixBackendSaveTimerRef.current !== null) {
        window.clearTimeout(mixBackendSaveTimerRef.current);
        mixBackendSaveTimerRef.current = null;
      }
      if (!skipMixSaveRef.current) {
        persistMixNow();
        flushMixBackendSave();
        void persistConfigNow();
      }
    };
  }, [
    canLoadFromStore,
    workspaceUserKey,
    persistConfigNow,
    persistMixNow,
    flushMixBackendSave,
  ]);

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
    if (!hydrated || skipMixSaveRef.current) {
      return;
    }
    persistMixNow(mixRows, selectedMixRowId);
  }, [hydrated, mixRows, selectedMixRowId, workspaceUserKey, persistMixNow]);

  useEffect(() => {
    const flush = () => {
      if (skipMixSaveRef.current) {
        return;
      }
      if (mixBackendSaveTimerRef.current !== null) {
        window.clearTimeout(mixBackendSaveTimerRef.current);
        mixBackendSaveTimerRef.current = null;
      }
      persistMixNow();
      flushMixBackendSave();
    };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    });
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [persistMixNow, flushMixBackendSave]);

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

  const setSelectedMixRowIdPersisted = useCallback(
    (rowId: string | null) => {
      applyMixState(latestMixRowsRef.current, rowId, { persist: true });
    },
    [applyMixState],
  );

  const addMixRow = useCallback((leadingPaths: string[] = []) => {
    const newRow = { ...createEmptyMixRow(), leadingPaths: [...leadingPaths] };
    const nextRows = [...latestMixRowsRef.current, newRow];
    applyMixState(nextRows, newRow.id, { persist: true });
    return newRow.id;
  }, [applyMixState]);

  const removeMixRow = useCallback(
    (rowId: string) => {
      const nextRows = latestMixRowsRef.current.filter((row) => row.id !== rowId);
      const nextRowId =
        latestSelectedMixRowIdRef.current === rowId
          ? resolveSelectedMixRowId(nextRows, null)
          : resolveSelectedMixRowId(nextRows, latestSelectedMixRowIdRef.current);
      applyMixState(nextRows, nextRowId, { persist: true });
    },
    [applyMixState],
  );

  const clearAllMixRows = useCallback(() => {
    applyMixState([], null, { persist: true });
  }, [applyMixState]);

  const replaceMixRows = useCallback(
    (rows: MixRow[]) => {
      const nextRowId = resolveSelectedMixRowId(rows, latestSelectedMixRowIdRef.current);
      applyMixState(rows, nextRowId, { persist: true });
    },
    [applyMixState],
  );

  /** Prefer over `replaceMixRows([...mixRows, x])` — reads latest rows from ref (no stale closure). */
  const updateMixRows = useCallback(
    (mutate: (current: MixRow[]) => MixRow[]) => {
      const next = mutate(latestMixRowsRef.current);
      const nextRowId = resolveSelectedMixRowId(next, latestSelectedMixRowIdRef.current);
      applyMixState(next, nextRowId, { persist: true });
    },
    [applyMixState],
  );

  return {
    hydrated,
    settingsLoading: !hydrated,
    inputFolder,
    outputFolder,
    exportSettings,
    mixRows,
    selectedMixRowId,
    setInputFolder: setInputFolderPersisted,
    setOutputFolder: setOutputFolderPersisted,
    patchExportSettings,
    setSelectedMixRowId: setSelectedMixRowIdPersisted,
    addMixRow,
    removeMixRow,
    clearAllMixRows,
    replaceMixRows,
    updateMixRows,
  };
}
