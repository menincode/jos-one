import { describe, expect, it } from "vitest";

import {
  formatVideoResolution,
  isVideoResolutionPending,
} from "@/features/video-merge/format-video-resolution";

describe("formatVideoResolution", () => {
  it("formats width and height with multiplication sign", () => {
    expect(formatVideoResolution({ width: 1920, height: 1080 })).toBe("1920×1080");
  });

  it("returns null when dimensions missing", () => {
    expect(formatVideoResolution({ width: null, height: null })).toBeNull();
    expect(formatVideoResolution({})).toBeNull();
  });

  it("detects pending state while probing", () => {
    expect(isVideoResolutionPending({ width: null, height: null }, true)).toBe(true);
    expect(isVideoResolutionPending({ width: 1920, height: 1080 }, true)).toBe(false);
  });
});
