import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { mixRowsToPayload, type MixRow } from "@/features/video-merge/mix-row-types";
import type { VideoMergeExportSettings } from "@/features/video-merge/video-merge-export-types";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import { isPywebviewShell } from "@/lib/pywebview/readiness";
import type {
  VideoMergeJobOutput,
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
  const [jobOutputs, setJobOutputs] = useState<VideoMergeJobOutput[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const statusRef = useRef<VideoMergeJobStatus>("idle");

  const applyJobSnapshot = useCallback(
    (job: {
      status: VideoMergeJobStatus;
      message?: string;
      progress?: number;
      total?: number;
      outputs?: VideoMergeJobOutput[];
      row_states?: Record<string, VideoMergeRowJobState>;
    }) => {
      setStatus(job.status);
      statusRef.current = job.status;
      if (job.status !== "running") {
        setIsCancelling(false);
      }
      setJobMessage(typeof job.message === "string" ? job.message : "");
      setJobProgress(typeof job.progress === "number" ? job.progress : 0);
      setJobTotal(typeof job.total === "number" ? job.total : 0);
      setJobOutputs(Array.isArray(job.outputs) ? job.outputs : []);
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
              "FFmpeg chưa sẵn sàng. Đợi tải plugin xong rồi thử lại.",
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
        statusRef.current = "running";
        setIsCancelling(false);
        setJobMessage("Đang chuẩn bị…");
        setJobProgress(0);
        setJobTotal(0);
        setRowJobStates({});
        setJobOutputs([]);
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
    if (statusRef.current !== "running") {
      toast.message("Không có tác vụ ghép đang chạy.");
      return;
    }
    if (isCancelling) {
      return;
    }
    setIsCancelling(true);
    try {
      const client = await createBridgeClient();
      const result = await client.cancelVideoMergeJob();
      if (!result.ok) {
        setIsCancelling(false);
        toast.error(result.message || "Không hủy được tác vụ.");
        return;
      }
      toast.message("Đang hủy… (dừng FFmpeg và các luồng đang chạy)");
      stopPolling();
      pollRef.current = window.setInterval(() => {
        void pollStatus();
      }, 250);
      void pollStatus();
    } catch (err) {
      setIsCancelling(false);
      const message = err instanceof Error ? err.message : "Không hủy được ghép video.";
      toast.error(message);
    }
  }, [isCancelling, pollStatus, stopPolling]);

  return {
    isRunning,
    isCancelling,
    status,
    jobMessage,
    jobProgress,
    jobTotal,
    rowJobStates,
    jobOutputs,
    start,
    cancel,
  };
}
