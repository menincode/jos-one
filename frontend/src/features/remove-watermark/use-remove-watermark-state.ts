import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  fetchRemoveWatermarkSettings,
  persistRemoveWatermarkSettings,
  preloadAppSettings,
} from "@/lib/settings/app-settings-api";
import { getRemoveWatermarkFolderHint } from "@/features/remove-watermark/remove-watermark-folder-validation";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import type { WatermarkVideoRowRecord } from "@/lib/pywebview/types";
import { useAuthStore } from "@/stores/auth-store";

const SAVE_DEBOUNCE_MS = 400;

function isRowEligible(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized !== "completed" && normalized !== "success" && normalized !== "done";
}

export function useRemoveWatermarkState() {
  const authLoading = useAuthStore((state) => state.isLoading);
  const canLoadFromStore = !authLoading;
  const [hydrated, setHydrated] = useState(false);
  const [inputFolder, setInputFolder] = useState("");
  const [outputFolder, setOutputFolder] = useState("");
  const [threadCount, setThreadCount] = useState(4);
  const [zoomPercent, setZoomPercent] = useState(4.0);
  const [rows, setRows] = useState<WatermarkVideoRowRecord[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const stopRequestedRef = useRef(false);
  const activeBatchRef = useRef<Set<string>>(new Set());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoLoadedRef = useRef(false);
  const latestSettingsRef = useRef({
    input_folder: "",
    output_folder: "",
    thread_count: 4,
    zoom_percent: 4.0,
  });

  latestSettingsRef.current = {
    input_folder: inputFolder,
    output_folder: outputFolder,
    thread_count: threadCount,
    zoom_percent: zoomPercent,
  };

  useEffect(() => {
    if (!canLoadFromStore) {
      return;
    }

    let cancelled = false;
    autoLoadedRef.current = false;
    setHydrated(false);

    void (async () => {
      try {
        await preloadAppSettings();
        const settings = await fetchRemoveWatermarkSettings();
        if (cancelled) return;
        setInputFolder(settings.input_folder);
        setOutputFolder(settings.output_folder);
        setThreadCount(settings.thread_count);
        setZoomPercent(settings.zoom_percent ?? 4.0);
      } catch {
        /* settings optional on first run */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoadFromStore]);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistRemoveWatermarkSettings(latestSettingsRef.current).catch(() => undefined);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [hydrated, inputFolder, outputFolder, threadCount, zoomPercent]);

  const loadVideos = useCallback(
    async (folder: string) => {
      const folderHint = getRemoveWatermarkFolderHint(folder, outputFolder);
      if (folderHint) {
        toast.error(folderHint);
        return;
      }
      const trimmed = folder.trim();
      setLoadingRows(true);
      try {
        const client = await createBridgeClient();
        const loaded = await client.listWatermarkVideosInFolder(
          trimmed,
          outputFolder.trim() || undefined,
        );
        setRows(loaded);
        if (loaded.length === 0) {
          toast.info("Không tìm thấy video trong thư mục.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Không tải được danh sách video.";
        toast.error(message);
      } finally {
        setLoadingRows(false);
      }
    },
    [outputFolder],
  );

  useEffect(() => {
    if (!hydrated || autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    const restoredInput = inputFolder.trim();
    const restoredOutput = outputFolder.trim();
    if (!restoredInput || !restoredOutput) return;
    void loadVideos(restoredInput);
  }, [hydrated, inputFolder, outputFolder, loadVideos]);

  const hasInputFolder = inputFolder.trim().length > 0;
  const hasOutputFolder = outputFolder.trim().length > 0;
  const eligibleRows = rows.filter((row) => isRowEligible(row.status));
  const canStart =
    hasInputFolder && hasOutputFolder && eligibleRows.length > 0 && !busy;

  const applyProgress = useCallback(
    (snapshot: Array<{ input_path: string; progress_pct: number }>) => {
      if (snapshot.length === 0 || activeBatchRef.current.size === 0) return;
      setRows((prev) =>
        prev.map((row) => {
          if (!activeBatchRef.current.has(row.inputPath)) return row;
          const hit = snapshot.find((s) => s.input_path === row.inputPath);
          if (!hit) return row;
          const progressPct = hit.progress_pct;
          const normalized = row.status.trim().toLowerCase();
          if (progressPct >= 100) {
            if (
              normalized === "cancelled" ||
              normalized === "canceled" ||
              normalized.startsWith("failed")
            ) {
              return { ...row, progressPct: 100 };
            }
            return { ...row, progressPct: 100, status: "completed" };
          }
          if (progressPct > 0) {
            return { ...row, progressPct, status: "processing" };
          }
          return { ...row, progressPct };
        }),
      );
    },
    [],
  );

  const startBatch = useCallback(async () => {
    const folderHint = getRemoveWatermarkFolderHint(inputFolder, outputFolder);
    if (folderHint) {
      toast.error(folderHint);
      return;
    }
    if (eligibleRows.length === 0) {
      toast.error("Tải danh sách video trước khi xóa watermark.");
      return;
    }
    if (!canStart) return;
    const batch = eligibleRows;
    const threads = Math.max(1, Math.min(32, Math.floor(threadCount || 1)));
    setBusy(true);
    stopRequestedRef.current = false;
    setStopRequested(false);
    activeBatchRef.current = new Set(batch.map((r) => r.inputPath));
    let poll: ReturnType<typeof setInterval> | undefined;
    try {
      setRows((prev) =>
        prev.map((row) =>
          batch.some((b) => b.inputPath === row.inputPath)
            ? { ...row, status: "pending", progressPct: 0 }
            : row,
        ),
      );
      poll = setInterval(() => {
        void createBridgeClient()
          .then((client) => client.getRemoveWatermarkProgress())
          .then((snapshot) => applyProgress(snapshot))
          .catch(() => undefined);
      }, 400);

      const client = await createBridgeClient();
      const results = await client.removeWatermarkBatch(
        batch.map((row) => ({
          file_name: row.fileName,
          input_path: row.inputPath,
          output_path: row.outputPath,
          zoom_percent: zoomPercent,
        })),
        threads,
      );
      if (results.length > 0) {
        const byPath = new Map(results.map((r) => [r.inputPath, r]));
        setRows((prev) => prev.map((row) => byPath.get(row.inputPath) ?? row));
      }
      const failed = results.filter((r) => r.status.toLowerCase().startsWith("failed")).length;
      const cancelled = results.filter((r) =>
        r.status.toLowerCase().startsWith("cancelled"),
      ).length;
      if (stopRequestedRef.current || cancelled > 0) {
        toast.info("Đã dừng xử lý.");
      } else if (failed > 0) {
        toast.error(`Có ${failed}/${results.length} video lỗi.`);
      } else {
        toast.success("Xóa watermark hoàn tất.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Xử lý thất bại.";
      toast.error(message);
    } finally {
      if (poll) clearInterval(poll);
      activeBatchRef.current = new Set();
      setBusy(false);
      stopRequestedRef.current = false;
      setStopRequested(false);
    }
  }, [applyProgress, canStart, eligibleRows, inputFolder, outputFolder, threadCount]);

  const stopBatch = useCallback(async () => {
    if (!busy || stopRequestedRef.current) return;
    stopRequestedRef.current = true;
    setStopRequested(true);
    setRows((prev) =>
      prev.map((row) =>
        row.status.toLowerCase() === "processing"
          ? { ...row, status: "cancelled" }
          : row,
      ),
    );
    try {
      const client = await createBridgeClient();
      const ok = await client.cancelRemoveWatermarkBatch();
      if (!ok) {
        toast.error("Không dừng được tiến trình.");
        stopRequestedRef.current = false;
        setStopRequested(false);
      }
    } catch {
      toast.error("Không dừng được tiến trình.");
      stopRequestedRef.current = false;
      setStopRequested(false);
    }
  }, [busy]);

  const openOutputDir = useCallback(async () => {
    const path = outputFolder.trim();
    if (!path) {
      toast.error("Chọn thư mục đầu ra");
      return;
    }
    try {
      const client = await createBridgeClient();
      const result = await client.openFolderInExplorer(path);
      if (!result.ok) {
        toast.error(
          result.message ||
            "Không mở được thư mục. Kiểm tra đường dẫn hoặc tạo thư mục trước.",
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không mở được thư mục đầu ra.";
      toast.error(message);
    }
  }, [outputFolder]);

  const previewRow = useCallback(async (row: WatermarkVideoRowRecord) => {
    const path = row.outputPath.trim() || row.inputPath.trim();
    if (!path) {
      toast.error("Không có file để xem.");
      return;
    }
    try {
      const client = await createBridgeClient();
      const result = await client.openMediaFile(path);
      if (!result.ok) toast.error("Không mở được video.");
    } catch {
      toast.error("Không mở được video.");
    }
  }, []);

  return {
    hydrated,
    settingsLoading: !hydrated || authLoading,
    inputFolder,
    outputFolder,
    threadCount,
    zoomPercent,
    rows,
    loadingRows,
    busy,
    stopRequested,
    canStart,
    eligibleRowCount: eligibleRows.length,
    setInputFolder,
    setOutputFolder,
    setThreadCount,
    setZoomPercent,
    loadVideos,
    startBatch,
    stopBatch,
    openOutputDir,
    previewRow,
  };
}
