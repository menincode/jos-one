import { describe, expect, it } from "vitest";

import {
  isVideoMetadataComplete,
  mergeVideosWithCache,
  videosNeedMetadataProbe,
} from "@/features/video-merge/video-metadata-cache";
import type { VideoFileItem } from "@/lib/pywebview/types";

const base = (overrides: Partial<VideoFileItem> = {}): VideoFileItem => ({
  name: "a.mp4",
  path: "D:\\in\\a.mp4",
  size_bytes: 1000,
  duration_sec: null,
  ...overrides,
});

describe("video-metadata-cache", () => {
  it("merges cached duration and resolution by path", () => {
    const fresh = [base({ size_bytes: 1000 })];
    const cached = [
      base({
        duration_sec: 12.5,
        width: 1920,
        height: 1080,
      }),
    ];
    const merged = mergeVideosWithCache(fresh, cached);
    expect(merged[0]?.duration_sec).toBe(12.5);
    expect(merged[0]?.width).toBe(1920);
    expect(merged[0]?.height).toBe(1080);
  });

  it("drops cached metadata when file size changed", () => {
    const fresh = [base({ size_bytes: 2000 })];
    const cached = [
      base({
        size_bytes: 1000,
        duration_sec: 12.5,
        width: 1280,
        height: 720,
      }),
    ];
    const merged = mergeVideosWithCache(fresh, cached);
    expect(merged[0]?.duration_sec).toBeNull();
    expect(merged[0]?.width).toBeUndefined();
  });

  it("detects when probe is still needed", () => {
    expect(videosNeedMetadataProbe([base()])).toBe(true);
    expect(
      videosNeedMetadataProbe([
        base({ duration_sec: 10, width: 1920, height: 1080 }),
      ]),
    ).toBe(false);
    expect(isVideoMetadataComplete(base({ duration_sec: 10 }))).toBe(false);
  });
});
