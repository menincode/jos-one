import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createBridgeClient } from "@/lib/pywebview/api-client";
import {
  getVideoMergeWorkspaceUserKey,
  loadFolderVideosFromWorkspace,
  persistFolderVideosToWorkspace,
} from "@/lib/settings/video-merge-workspace-storage";
import type { VideoFileItem } from "@/lib/pywebview/types";

const LIST_DEBOUNCE_MS = 400;

export function useVideoList(folderPath: string) {
  const [videos, setVideos] = useState<VideoFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [probingDurations, setProbingDurations] = useState(false);
  const loadGenerationRef = useRef(0);

  const loadVideos = useCallback(async (folder: string) => {
    const trimmed = folder.trim();
    if (!trimmed) {
      setVideos([]);
      setLoading(false);
      setProbingDurations(false);
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    const isStale = () => loadGenerationRef.current !== generation;

    const workspaceKey = getVideoMergeWorkspaceUserKey();
    const cached = loadFolderVideosFromWorkspace(trimmed, workspaceKey);
    if (cached?.length) {
      setVideos(cached);
    }

    setLoading(true);
    setProbingDurations(false);
    try {
      const client = await createBridgeClient();
      const result = await client.listVideosInFolder(trimmed);
      if (isStale()) return;
      if (!result.ok) {
        setVideos([]);
        if (result.message) {
          toast.error(result.message);
        }
        return;
      }
      setVideos(result.videos);
      setLoading(false);

      setProbingDurations(true);
      const probed = await client.probeVideosInFolder(trimmed);
      if (isStale()) return;
      if (probed.ok) {
        setVideos(probed.videos);
        persistFolderVideosToWorkspace(trimmed, probed.videos, undefined, workspaceKey);
      }
    } catch (err) {
      if (isStale()) return;
      setVideos([]);
      const message =
        err instanceof Error ? err.message : "Không thể đọc danh sách video.";
      toast.error(message);
    } finally {
      if (!isStale()) {
        setLoading(false);
        setProbingDurations(false);
      }
    }
  }, []);

  useEffect(() => {
    const trimmed = folderPath.trim();
    if (!trimmed) {
      loadGenerationRef.current += 1;
      setVideos([]);
      setLoading(false);
      setProbingDurations(false);
      return;
    }

    loadGenerationRef.current += 1;
    const workspaceKey = getVideoMergeWorkspaceUserKey();
    const cached = loadFolderVideosFromWorkspace(trimmed, workspaceKey);
    setVideos(cached ?? []);
    setLoading(true);
    setProbingDurations(false);

    const timer = window.setTimeout(() => {
      void loadVideos(trimmed);
    }, LIST_DEBOUNCE_MS);

    return () => {
      loadGenerationRef.current += 1;
      window.clearTimeout(timer);
    };
  }, [folderPath, loadVideos]);

  const refresh = useCallback(() => {
    const trimmed = folderPath.trim();
    if (!trimmed) {
      toast.error("Chọn thư mục đầu vào trước.");
      return;
    }
    void loadVideos(trimmed);
  }, [folderPath, loadVideos]);

  return { videos, loading, probingDurations, refresh };
}
