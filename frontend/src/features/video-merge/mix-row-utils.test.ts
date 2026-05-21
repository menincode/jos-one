import { describe, expect, it } from "vitest";

import {
  buildMixValidationContext,
  getMixRowStatus,
  getMixRowStatusLabel,
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
});
