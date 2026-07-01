import { useCallback, useEffect, useRef, useState } from "react";

import { createBridgeClient } from "@/lib/pywebview/api-client";
import type {
  BridgeClient,
  VideoFileItem,
  VideoLoopFileStatus,
  VideoLoopJobStatus,
} from "@/lib/pywebview/types";

export function useVideoLoopJob() {
  /* ── Form state ── */
  const [inputFolder, setInputFolder] = useState("");
  const [outputFolder, setOutputFolder] = useState("");
  const [loopCount, setLoopCount] = useState(10);
  const [threadCount, setThreadCount] = useState(4);
  const [settingsLoading, setSettingsLoading] = useState(true);

  /* ── Job state ── */
  const [jobStatus, setJobStatus] = useState<VideoLoopJobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [speedX, setSpeedX] = useState<number | null>(null);
  const [totalFiles, setTotalFiles] = useState(0);
  const [doneFiles, setDoneFiles] = useState(0);
  const [fileStatuses, setFileStatuses] = useState<VideoLoopFileStatus[]>([]);

  /* ── Video list state ── */
  const [videoFiles, setVideoFiles] = useState<VideoFileItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  const clientRef = useRef<BridgeClient | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const busy = jobStatus === "running";

  /* ── Init: load saved settings ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = await createBridgeClient();
        clientRef.current = client;
        const s = await client.getVideoLoopSettings();
        if (cancelled) return;
        setInputFolder(s.input_folder || "");
        setOutputFolder(s.output_folder || "");
        setLoopCount(s.loop_count || 10);
        setThreadCount(s.thread_count || 4);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Load video files when inputFolder changes ── */
  useEffect(() => {
    if (!inputFolder.trim()) {
      setVideoFiles([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setVideosLoading(true);
      try {
        const c = clientRef.current;
        if (!c) return;
        const r = await c.probeVideosInFolder(inputFolder);
        if (cancelled) return;
        setVideoFiles(r.ok ? r.videos : []);
      } catch {
        if (!cancelled) setVideoFiles([]);
      } finally {
        if (!cancelled) setVideosLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inputFolder]);

  /* ── Save settings whenever form changes ── */
  const saveSettings = useCallback(
    async (folder: string, outFolder: string, count: number, threads: number) => {
      const c = clientRef.current;
      if (!c) return;
      try {
        await c.saveVideoLoopSettings(folder, outFolder, count, threads);
      } catch {
        /* swallow */
      }
    },
    [],
  );

  const handleSetInputFolder = useCallback(
    (v: string) => {
      setInputFolder(v);
      void saveSettings(v, outputFolder, loopCount, threadCount);
    },
    [outputFolder, loopCount, threadCount, saveSettings],
  );

  const handleSetOutputFolder = useCallback(
    (v: string) => {
      setOutputFolder(v);
      void saveSettings(inputFolder, v, loopCount, threadCount);
    },
    [inputFolder, loopCount, threadCount, saveSettings],
  );

  const handleSetLoopCount = useCallback(
    (v: number) => {
      const safe = Math.max(2, Math.min(100, Math.floor(v)));
      setLoopCount(safe);
      void saveSettings(inputFolder, outputFolder, safe, threadCount);
    },
    [inputFolder, outputFolder, threadCount, saveSettings],
  );

  const handleSetThreadCount = useCallback(
    (v: number) => {
      const safe = Math.max(1, Math.min(32, Math.floor(v)));
      setThreadCount(safe);
      void saveSettings(inputFolder, outputFolder, loopCount, safe);
    },
    [inputFolder, outputFolder, loopCount, saveSettings],
  );


  /* ── Browse folder dialog ── */
  const browseInputFolder = useCallback(async () => {
    const c = clientRef.current;
    if (!c) return;
    try {
      const r = await c.openFolderDialog(inputFolder);
      if (r.ok && r.path) handleSetInputFolder(r.path);
    } catch {
      /* ignore */
    }
  }, [inputFolder, handleSetInputFolder]);

  const browseOutputFolder = useCallback(async () => {
    const c = clientRef.current;
    if (!c) return;
    try {
      const r = await c.openOutputFolderDialog(outputFolder);
      if (r.ok && r.path) handleSetOutputFolder(r.path);
    } catch {
      /* ignore */
    }
  }, [outputFolder, handleSetOutputFolder]);

  /* ── Poll job status ── */
  const startPoll = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const c = clientRef.current;
      if (!c) return;
      try {
        const s = await c.getVideoLoopJobStatus();
        setJobStatus(s.status);
        setProgress(s.progress);
        setMessage(s.message);
        setOutputPath(s.output_path);
        setSpeedX(s.speed_x);
        setTotalFiles(s.total_files);
        setDoneFiles(s.done_files);
        setFileStatuses(s.file_statuses ?? []);
        if (s.status !== "running") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        /* ignore */
      }
    }, 400);
  }, []);

  /* ── Start ── */
  const startJob = useCallback(async () => {
    const c = clientRef.current;
    if (!c) return;
    setJobStatus("running");
    setProgress(0);
    setMessage("Đang khởi tạo…");
    setOutputPath("");
    setSpeedX(null);
    setTotalFiles(0);
    setDoneFiles(0);
    setFileStatuses([]);
    try {
      const r = await c.startVideoLoopJob(inputFolder, outputFolder, loopCount, threadCount);
      if (!r.ok) {
        setJobStatus("error");
        setMessage(r.message);
        return;
      }
      startPoll();
    } catch (e) {
      setJobStatus("error");
      setMessage(String(e));
    }
  }, [inputFolder, outputFolder, loopCount, threadCount, startPoll]);

  /* ── Cancel ── */
  const cancelJob = useCallback(async () => {
    const c = clientRef.current;
    if (!c) return;
    try {
      await c.cancelVideoLoopJob();
    } catch {
      /* ignore */
    }
  }, []);

  /* ── Open output ── */
  const openOutputDir = useCallback(async () => {
    const c = clientRef.current;
    if (!c || !outputFolder.trim()) return;
    try {
      await c.openFolderInExplorer(outputFolder);
    } catch {
      /* ignore */
    }
  }, [outputFolder]);

  const openOutputFile = useCallback(async () => {
    const c = clientRef.current;
    if (!c || !outputPath.trim()) return;
    try {
      await c.openMediaFile(outputPath);
    } catch {
      /* ignore */
    }
  }, [outputPath]);

  /* ── Open any file ── */
  const openFile = useCallback(async (filePath: string) => {
    const c = clientRef.current;
    if (!c || !filePath.trim()) return;
    try {
      await c.openMediaFile(filePath);
    } catch {
      /* ignore */
    }
  }, []);

  /* ── Reset ── */
  const resetJob = useCallback(() => {
    setJobStatus("idle");
    setProgress(0);
    setMessage("");
    setOutputPath("");
    setSpeedX(null);
    setTotalFiles(0);
    setDoneFiles(0);
    setFileStatuses([]);
  }, []);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const canStart =
    !busy &&
    !settingsLoading &&
    inputFolder.trim().length > 0 &&
    outputFolder.trim().length > 0 &&
    loopCount >= 2;

  return {
    inputFolder,
    outputFolder,
    loopCount,
    threadCount,
    settingsLoading,
    jobStatus,
    progress,
    message,
    outputPath,
    speedX,
    totalFiles,
    doneFiles,
    busy,
    canStart,
    setInputFolder: handleSetInputFolder,
    setOutputFolder: handleSetOutputFolder,
    setLoopCount: handleSetLoopCount,
    setThreadCount: handleSetThreadCount,
    browseInputFolder,
    browseOutputFolder,
    startJob,
    cancelJob,
    openOutputDir,
    openOutputFile,
    openFile,
    resetJob,
    videoFiles,
    videosLoading,
    fileStatuses,
  };
}
