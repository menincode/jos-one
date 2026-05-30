import { describe, expect, it } from "vitest";

import {
  formatMixClipCount,
  mixClipCountForRow,
  mixTotalDurationForRow,
} from "@/features/video-merge/mix-row-mix-stats";

describe("mix-row-mix-stats", () => {
  it("reads planned clip count from row job state", () => {
    expect(
      mixClipCountForRow("r1", {
        r1: { status: "running", message: "", mix_clip_count: 4 },
      }),
    ).toBe(4);
  });

  it("returns null clip count when planner stats missing", () => {
    expect(mixClipCountForRow("r1", { r1: { status: "pending", message: "" } })).toBeNull();
    expect(formatMixClipCount(null)).toBe("—");
  });

  it("prefers planned total duration over export duration", () => {
    expect(
      mixTotalDurationForRow(
        "r1",
        { r1: { status: "done", message: "", mix_total_duration_sec: 120.5 } },
        [{ row_id: "r1", ok: true, path: "/out.mp4", message: "", output_duration_sec: 95 }],
      ),
    ).toBe(120.5);
  });

  it("falls back to export duration when planned total missing", () => {
    expect(
      mixTotalDurationForRow(
        "r1",
        { r1: { status: "done", message: "", output_duration_sec: 88 } },
        [{ row_id: "r1", ok: true, path: "/out.mp4", message: "", output_duration_sec: 88 }],
      ),
    ).toBe(88);
  });
});
