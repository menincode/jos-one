import { describe, expect, it } from "vitest";

import {
  addLeadingVideosToRow,
  setLeadingVideosForRow,
  buildMixValidationContext,
  getMixRowStatus,
  getMixRowStatusLabel,
  getVideoMixUsageLabel,
  validateMixRowAtIndex,
  validateMixRowsForStart,
} from "@/features/video-merge/mix-row-utils";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import type { VideoFileItem } from "@/lib/pywebview/types";

const videos: VideoFileItem[] = [
  { name: "a.mp4", path: "/a.mp4", size_bytes: 100, duration_sec: 30 },
  { name: "b.mp4", path: "/b.mp4", size_bytes: 100, duration_sec: 40 },
];

describe("validateMixRowsForStart", () => {
  it("requires at least one row", () => {
    expect(validateMixRowsForStart([], videos, false)).toMatch(/ít nhất một dòng/);
  });

  it("requires 1-5 leading videos per row", () => {
    const rows: MixRow[] = [{ id: "1", leadingPaths: [] }];
    expect(validateMixRowsForStart(rows, videos, false)).toMatch(/Dòng 1/);
  });

  it("passes for valid rows", () => {
    const rows: MixRow[] = [{ id: "1", leadingPaths: ["/a.mp4"] }];
    expect(validateMixRowsForStart(rows, videos, false)).toBeNull();
  });

  it("skips validation while loading folder videos", () => {
    const rows: MixRow[] = [{ id: "1", leadingPaths: ["/a.mp4", "/b.mp4"] }];
    const ctx = buildMixValidationContext({
      loading: true,
      probingDurations: false,
      durationMaxSec: "50",
    });
    expect(validateMixRowsForStart(rows, videos, false, ctx)).toBeNull();
  });

  it("rejects leading duration over max", () => {
    const rows: MixRow[] = [{ id: "1", leadingPaths: ["/a.mp4", "/b.mp4"] }];
    const ctx = buildMixValidationContext({
      loading: false,
      probingDurations: false,
      durationMaxSec: "50",
    });
    expect(validateMixRowsForStart(rows, videos, false, ctx)).toMatch(
      /vượt quá thời lượng tối đa/,
    );
  });

  it("allows duplicate leading video across rows", () => {
    const rows: MixRow[] = [
      { id: "1", leadingPaths: ["/a.mp4"] },
      { id: "2", leadingPaths: ["/a.mp4"] },
    ];
    expect(validateMixRowsForStart(rows, videos, false)).toBeNull();
  });
});

describe("validateMixRowAtIndex", () => {
  it("allows duplicate leading video across rows", () => {
    const rows: MixRow[] = [
      { id: "1", leadingPaths: ["/a.mp4"] },
      { id: "2", leadingPaths: ["/a.mp4"] },
    ];
    const ctx = buildMixValidationContext({
      loading: false,
      probingDurations: false,
    });
    expect(validateMixRowAtIndex(1, rows[1], videos, ctx, rows)).toBeNull();
  });
});

describe("getMixRowStatus", () => {
  it("returns empty, invalid, and ready", () => {
    expect(getMixRowStatus({ id: "1", leadingPaths: [] })).toBe("empty");
    expect(getMixRowStatus({ id: "1", leadingPaths: ["/a.mp4"] })).toBe("ready");
    expect(
      getMixRowStatus({
        id: "1",
        leadingPaths: ["/a.mp4", "/b.mp4", "/c.mp4", "/d.mp4", "/e.mp4", "/f.mp4"],
      }),
    ).toBe("invalid");
  });

  it("returns loading while probing durations", () => {
    expect(
      getMixRowStatus(
        { id: "1", leadingPaths: ["/a.mp4"] },
        {
          validation: buildMixValidationContext({
            loading: false,
            probingDurations: true,
          }),
        },
      ),
    ).toBe("loading");
  });
});

describe("getMixRowStatusLabel", () => {
  it("shows probing label during duration probe", () => {
    expect(
      getMixRowStatusLabel(
        { id: "1", leadingPaths: ["/a.mp4"] },
        {
          validation: buildMixValidationContext({
            loading: false,
            probingDurations: true,
          }),
        },
      ),
    ).toBe("Đang đọc thời lượng…");
  });

  it("uses short label for invalid rows", () => {
    const row: MixRow = { id: "1", leadingPaths: ["/a.mp4", "/b.mp4", "/a.mp4", "/b.mp4", "/a.mp4", "/b.mp4"] };
    expect(
      getMixRowStatusLabel(row, {
        rowIndex: 0,
        videos: [
          ...videos,
          { name: "c.mp4", path: "/c.mp4", size_bytes: 1, duration_sec: 10 },
          { name: "d.mp4", path: "/d.mp4", size_bytes: 1, duration_sec: 10 },
          { name: "e.mp4", path: "/e.mp4", size_bytes: 1, duration_sec: 10 },
          { name: "f.mp4", path: "/f.mp4", size_bytes: 1, duration_sec: 10 },
        ],
        validation: buildMixValidationContext({ loading: false, probingDurations: false }),
      }),
    ).toBe("Chưa hợp lệ");
  });
});

describe("getVideoMixUsageLabel", () => {
  it("returns mix label when path is used", () => {
    const rows: MixRow[] = [
      { id: "1", leadingPaths: ["/a.mp4"] },
      { id: "2", leadingPaths: ["/b.mp4"] },
    ];
    expect(getVideoMixUsageLabel("/a.mp4", rows)).toBe("Đã dùng: Mix #1");
    expect(getVideoMixUsageLabel("/c.mp4", rows)).toBeNull();
  });

  it("lists all mixes when path is reused", () => {
    const rows: MixRow[] = [
      { id: "1", leadingPaths: ["/a.mp4"] },
      { id: "2", leadingPaths: ["/a.mp4", "/b.mp4"] },
    ];
    expect(getVideoMixUsageLabel("/a.mp4", rows)).toBe("Đã dùng: Mix #1, #2");
  });
});

describe("setLeadingVideosForRow", () => {
  it("replaces leading paths for a mix row", () => {
    const rows: MixRow[] = [{ id: "1", leadingPaths: ["/a.mp4", "/b.mp4", "/c.mp4"] }];
    const result = setLeadingVideosForRow(rows, "1", ["/a.mp4", "/b.mp4"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].leadingPaths).toEqual(["/a.mp4", "/b.mp4"]);
    }
  });

  it("allows clearing all leading videos", () => {
    const rows: MixRow[] = [{ id: "1", leadingPaths: ["/a.mp4"] }];
    const result = setLeadingVideosForRow(rows, "1", []);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].leadingPaths).toEqual([]);
    }
  });

  it("allows path used in another row", () => {
    const rows: MixRow[] = [
      { id: "1", leadingPaths: ["/a.mp4"] },
      { id: "2", leadingPaths: ["/b.mp4"] },
    ];
    const result = setLeadingVideosForRow(rows, "2", ["/a.mp4"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[1].leadingPaths).toEqual(["/a.mp4"]);
    }
  });
});

describe("addLeadingVideosToRow", () => {
  it("appends paths up to max per row", () => {
    const rows: MixRow[] = [{ id: "1", leadingPaths: [] }];
    const result = addLeadingVideosToRow(rows, "1", ["/a.mp4", "/b.mp4"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].leadingPaths).toEqual(["/a.mp4", "/b.mp4"]);
    }
  });

  it("allows path used in another row", () => {
    const rows: MixRow[] = [
      { id: "1", leadingPaths: ["/a.mp4"] },
      { id: "2", leadingPaths: [] },
    ];
    const result = addLeadingVideosToRow(rows, "2", ["/a.mp4"]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[1].leadingPaths).toEqual(["/a.mp4"]);
    }
  });
});
