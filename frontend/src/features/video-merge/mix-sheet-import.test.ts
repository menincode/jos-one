import { describe, expect, it } from "vitest";

import {
  buildMixRowsFromSheet,
  resolveVideoByCellName,
} from "@/features/video-merge/mix-sheet-import";
import type { VideoFileItem } from "@/lib/pywebview/types";

const videos: VideoFileItem[] = [
  { name: "201.mp4", path: "C:\\in\\201.mp4", size_bytes: 1, duration_sec: 10 },
  { name: "202.mp4", path: "C:\\in\\202.mp4", size_bytes: 1, duration_sec: 10 },
  { name: "203.mp4", path: "C:\\in\\203.mp4", size_bytes: 1, duration_sec: 10 },
  { name: "205.mp4", path: "C:\\in\\205.mp4", size_bytes: 1, duration_sec: 10 },
  { name: "207.mp4", path: "C:\\in\\207.mp4", size_bytes: 1, duration_sec: 10 },
  { name: "209.mp4", path: "C:\\in\\209.mp4", size_bytes: 1, duration_sec: 10 },
];

describe("resolveVideoByCellName", () => {
  it("matches stem without extension", () => {
    expect(resolveVideoByCellName("201", videos)).toEqual({
      ok: true,
      path: "C:\\in\\201.mp4",
    });
  });

  it("matches full filename with extension", () => {
    expect(resolveVideoByCellName("202.mp4", videos)).toEqual({
      ok: true,
      path: "C:\\in\\202.mp4",
    });
  });

  it("returns not_found for missing file", () => {
    expect(resolveVideoByCellName("999", videos)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("returns ambiguous when stem matches multiple extensions", () => {
    const ambiguous: VideoFileItem[] = [
      { name: "clip.mp4", path: "C:\\in\\clip.mp4", size_bytes: 1, duration_sec: 1 },
      { name: "clip.mov", path: "C:\\in\\clip.mov", size_bytes: 1, duration_sec: 1 },
    ];
    const result = resolveVideoByCellName("clip", ambiguous);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("ambiguous");
    }
  });
});

describe("buildMixRowsFromSheet", () => {
  it("skips header row and builds one mix per data row", () => {
    const sheetRows = [
      ["Số tập đầu tiên", "Số tập thứ 2", "Số tập thứ 3"],
      ["201", "202", "203"],
      ["205", "207", "209"],
    ];
    const result = buildMixRowsFromSheet(sheetRows, videos);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].leadingPaths).toEqual([
      "C:\\in\\201.mp4",
      "C:\\in\\202.mp4",
      "C:\\in\\203.mp4",
    ]);
    expect(result.rows[1].leadingPaths).toEqual([
      "C:\\in\\205.mp4",
      "C:\\in\\207.mp4",
      "C:\\in\\209.mp4",
    ]);
  });

  it("reports warnings for missing files", () => {
    const sheetRows = [
      ["A", "B"],
      ["201", "missing"],
    ];
    const result = buildMixRowsFromSheet(sheetRows, videos);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.rows[0].leadingPaths).toEqual(["C:\\in\\201.mp4"]);
    expect(result.warnings.some((w) => w.includes("missing"))).toBe(true);
  });

  it("fails when only header present", () => {
    const result = buildMixRowsFromSheet([["Header"]], videos);
    expect(result.ok).toBe(false);
  });
});
