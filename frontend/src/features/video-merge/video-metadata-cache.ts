import { formatVideoResolution } from "@/features/video-merge/format-video-resolution";
import { normalizePathKey } from "@/features/video-merge/video-path-utils";
import type { VideoFileItem } from "@/lib/pywebview/types";

/** True when duration and resolution are available for UI / planner. */
export function isVideoMetadataComplete(video: VideoFileItem): boolean {
  return (
    video.duration_sec != null &&
    Number.isFinite(video.duration_sec) &&
    video.duration_sec > 0 &&
    formatVideoResolution(video) != null
  );
}

export function videosNeedMetadataProbe(videos: VideoFileItem[]): boolean {
  return videos.some((video) => !isVideoMetadataComplete(video));
}

function cacheEntryValid(fresh: VideoFileItem, cached: VideoFileItem): boolean {
  if (fresh.size_bytes <= 0 || cached.size_bytes <= 0) {
    return true;
  }
  return fresh.size_bytes === cached.size_bytes;
}

/** Merge cached duration/resolution onto a fresh folder scan (invalidate when size changes). */
export function mergeVideoWithCache(
  fresh: VideoFileItem,
  cached: VideoFileItem | undefined,
): VideoFileItem {
  if (!cached || !cacheEntryValid(fresh, cached)) {
    return fresh;
  }
  return {
    ...fresh,
    duration_sec: fresh.duration_sec ?? cached.duration_sec ?? null,
    duration_ffmpeg_sec:
      fresh.duration_ffmpeg_sec ?? cached.duration_ffmpeg_sec ?? undefined,
    width: fresh.width ?? cached.width,
    height: fresh.height ?? cached.height,
  };
}

export function mergeVideosWithCache(
  fresh: VideoFileItem[],
  cached: VideoFileItem[] | null | undefined,
): VideoFileItem[] {
  if (!cached?.length) {
    return fresh;
  }
  const cacheByKey = new Map<string, VideoFileItem>();
  for (const item of cached) {
    const key = normalizePathKey(item.path);
    if (key) {
      cacheByKey.set(key, item);
    }
  }
  return fresh.map((video) =>
    mergeVideoWithCache(video, cacheByKey.get(normalizePathKey(video.path))),
  );
}

export function videosToBridgePayload(videos: VideoFileItem[]): Array<Record<string, unknown>> {
  return videos.map((video) => ({
    name: video.name,
    path: video.path,
    size_bytes: video.size_bytes,
    duration_sec: video.duration_sec,
    ...(video.duration_ffmpeg_sec != null
      ? { duration_ffmpeg_sec: video.duration_ffmpeg_sec }
      : {}),
    ...(video.width != null ? { width: video.width } : {}),
    ...(video.height != null ? { height: video.height } : {}),
  }));
}
