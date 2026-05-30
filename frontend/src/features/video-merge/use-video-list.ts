import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  mergeVideosWithCache,
  videosNeedMetadataProbe,
} from "@/features/video-merge/video-metadata-cache";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import {
  getVideoMergeWorkspaceUserKey,
  loadFolderVideosFromWorkspace,
  persistFolderVideosToWorkspace,
} from "@/lib/settings/video-merge-workspace-storage";
import type { VideoFileItem } from "@/lib/pywebview/types";

const LIST_DEBOUNCE_MS = 400;

function saveFolderVideoCache(folder: string, videos: VideoFileItem[], userKey: string): void {
  if (!folder.trim() || videos.length === 0) {
    return;
  }
  persistFolderVideosToWorkspace(folder, videos, undefined, userKey);
}

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

      const merged = mergeVideosWithCache(result.videos, cached);
      setVideos(merged);
      saveFolderVideoCache(trimmed, merged, workspaceKey);
      setLoading(false);

      if (!videosNeedMetadataProbe(merged)) {
        return;
      }

      setProbingDurations(true);
      const probed = await client.probeVideosInFolder(trimmed);
      if (isStale()) return;
      if (probed.ok) {
        const probedMerged = mergeVideosWithCache(probed.videos, merged);
        setVideos(probedMerged);
        saveFolderVideoCache(trimmed, probedMerged, workspaceKey);
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
