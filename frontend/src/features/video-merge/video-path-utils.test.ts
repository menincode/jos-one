import { describe, expect, it } from "vitest";

import type { MixRow } from "@/features/video-merge/mix-row-types";
import {
  normalizePathKey,
  reconcileMixRowsWithVideos,
} from "@/features/video-merge/video-path-utils";
import type { VideoFileItem } from "@/lib/pywebview/types";

const videos: VideoFileItem[] = [
  {
    name: "a.mp4",
    path: "E:\\in\\a.mp4",
    size_bytes: 1,
    duration_sec: 10,
  },
  {
    name: "b.mp4",
    path: "E:\\in\\b.mp4",
    size_bytes: 1,
    duration_sec: 10,
  },
];

describe("normalizePathKey", () => {
  it("treats slash variants as the same path", () => {
    expect(normalizePathKey("E:/in/a.mp4")).toBe(normalizePathKey("E:\\in\\a.mp4"));
  });
});

describe("reconcileMixRowsWithVideos", () => {
  it("keeps leading paths not yet in the folder scan", () => {
    const rows: MixRow[] = [
      { id: "1", leadingPaths: ["D:\\in\\pending.mp4"] },
    ];
    const result = reconcileMixRowsWithVideos(rows, videos);
    expect(result.changed).toBe(false);
    expect(result.rows[0].leadingPaths).toEqual(["D:\\in\\pending.mp4"]);
  });

  it("removes duplicate leading paths from later rows", () => {
    const rows: MixRow[] = [
      { id: "1", leadingPaths: ["E:\\in\\a.mp4"] },
      { id: "2", leadingPaths: ["e:/in/a.mp4"] },
    ];
    const result = reconcileMixRowsWithVideos(rows, videos, { dedupeAcrossRows: true });
    expect(result.changed).toBe(true);
    expect(result.rows[0].leadingPaths).toEqual(["E:\\in\\a.mp4"]);
    expect(result.rows[1].leadingPaths).toEqual([]);
  });
});
