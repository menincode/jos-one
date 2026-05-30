import type { VideoFileItem } from "@/lib/pywebview/types";

/** Display label e.g. `1920×1080`, or null when unknown. */
export function formatVideoResolution(
  video: Pick<VideoFileItem, "width" | "height">,
): string | null {
  const width = video.width;
  const height = video.height;
  if (
    typeof width === "number" &&
    typeof height === "number" &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    return `${width}×${height}`;
  }
  return null;
}

export function isVideoResolutionPending(
  video: Pick<VideoFileItem, "width" | "height">,
  probingDurations: boolean,
): boolean {
  return probingDurations && formatVideoResolution(video) === null;
}
