import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { mixRowsToPayload, type MixRow } from "@/features/video-merge/mix-row-types";
import type { VideoMergeExportSettings } from "@/features/video-merge/video-merge-export-types";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import { isPywebviewShell } from "@/lib/pywebview/readiness";
import type {
  VideoMergeJobStatus,
  VideoMergeRowJobState,
} from "@/lib/pywebview/types";

const POLL_MS = 800;

type StartMergeParams = {
  inputFolder: string;
  outputFolder: string;
  mixRows: MixRow[];
  exportSettings: VideoMergeExportSettings;
};

export function useVideoMergeJob() {
  const [status, setStatus] = useState<VideoMergeJobStatus>("idle");
  const [jobMessage, setJobMessage] = useState("");
  const pollRef = useRef<number | null>(null);
  const isRunning = status === "running";

  const [jobProgress, setJobProgress] = useState(0);
  const [jobTotal, setJobTotal] = useState(0);
  const [rowJobStates, setRowJobStates] = useState<Record<string, VideoMergeRowJobState>>(
    {},
  );

  const applyJobSnapshot = useCallback(
    (job: {
      status: VideoMergeJobStatus;
      message?: string;
      progress?: number;
      total?: number;
      row_states?: Record<string, VideoMergeRowJobState>;
    }) => {
      setStatus(job.status);
      setJobMessage(typeof job.message === "string" ? job.message : "");
      setJobProgress(typeof job.progress === "number" ? job.progress : 0);
      setJobTotal(typeof job.total === "number" ? job.total : 0);
      setRowJobStates(
        job.row_states && typeof job.row_states === "object" ? job.row_states : {},
      );
    },
    [],
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const client = await createBridgeClient();
      const job = await client.getVideoMergeJobStatus();
      applyJobSnapshot(job);

      if (job.status === "running") {
        return;
      }

      stopPolling();

      if (job.status === "done") {
        toast.success(job.message || "Ghép video hoàn tất.");
      } else if (job.status === "cancelled") {
        toast.message(job.message || "Đã hủy ghép video.");
      } else if (job.status === "error") {
        toast.error(job.message || "Ghép video thất bại.");
      }
    } catch (err) {
      stopPolling();
      const message = err instanceof Error ? err.message : "Không đọc được trạng thái ghép.";
      applyJobSnapshot({ status: "error", message });
      toast.error(message);
    }
  }, [applyJobSnapshot, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = window.setInterval(() => {
      void pollStatus();
    }, POLL_MS);
    void pollStatus();
  }, [pollStatus, stopPolling]);

  useEffect(() => {
    if (!isPywebviewShell()) {
      return;
    }
    void (async () => {
      try {
        const client = await createBridgeClient();
        const job = await client.getVideoMergeJobStatus();
        applyJobSnapshot(job);
        if (job.status === "running") {
          startPolling();
        }
      } catch {
        /* bridge not ready yet */
      }
    })();
    return () => stopPolling();
  }, [applyJobSnapshot, startPolling, stopPolling]);

  const start = useCallback(
    async ({ inputFolder, outputFolder, mixRows, exportSettings }: StartMergeParams) => {
      try {
        const client = await createBridgeClient();

        if (isPywebviewShell()) {
          const ffmpeg = await client.getFfmpegStatus();
          if (!ffmpeg.ready) {
            toast.error(
              "FFmpeg chưa sẵn sàng. Đợi tải plugin xong (màn Cài đặt) rồi thử lại.",
            );
            return;
          }
        }

        const result = await client.startVideoMergeJob(
          inputFolder,
          outputFolder,
          mixRowsToPayload(mixRows),
          exportSettings,
        );
        if (!result.ok) {
          toast.error(result.message || "Không bắt đầu được ghép video.");
          return;
        }
        setStatus("running");
        setJobMessage("Đang chuẩn bị…");
        setJobProgress(0);
        setJobTotal(0);
        setRowJobStates({});
        startPolling();
        toast.message("Đang ghép video…");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Không bắt đầu được ghép video.";
        toast.error(message);
      }
    },
    [startPolling],
  );

  const cancel = useCallback(async () => {
    if (!isRunning) {
      toast.message("Không có tác vụ ghép đang chạy.");
      return;
    }
    try {
      const client = await createBridgeClient();
      const result = await client.cancelVideoMergeJob();
      if (!result.ok) {
        toast.error(result.message || "Không hủy được tác vụ.");
        return;
      }
      toast.message("Đang hủy…");
      void pollStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không hủy được ghép video.";
      toast.error(message);
    }
  }, [isRunning, pollStatus]);

  return {
    isRunning,
    status,
    jobMessage,
    jobProgress,
    jobTotal,
    rowJobStates,
    start,
    cancel,
  };
}
