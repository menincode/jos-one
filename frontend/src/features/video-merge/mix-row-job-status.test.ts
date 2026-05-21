import { describe, expect, it } from "vitest";

import { resolveMixRowDisplay } from "@/features/video-merge/mix-row-job-status";
import { buildMixValidationContext } from "@/features/video-merge/mix-row-utils";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import type { VideoFileItem } from "@/lib/pywebview/types";

const readyRow: MixRow = {
  id: "row-1",
  leadingPaths: ["D:\\in\\a.mp4"],
};

const videos: VideoFileItem[] = [
  { name: "a.mp4", path: "D:\\in\\a.mp4", size_bytes: 1, duration_sec: 10 },
];

describe("resolveMixRowDisplay", () => {
  it("shows merge error with info when job row failed", () => {
    const display = resolveMixRowDisplay(
      readyRow,
      0,
      videos,
      {
        status: "error",
        message: "FFmpeg lỗi codec.",
      },
      false,
    );
    expect(display.key).toBe("merge_error");
    expect(display.label).toBe("Xử lý lỗi");
    expect(display.showErrorInfo).toBe(true);
    expect(display.errorMessage).toBe("FFmpeg lỗi codec.");
  });

  it("shows running while job row is active", () => {
    const display = resolveMixRowDisplay(
      readyRow,
      0,
      videos,
      {
        status: "running",
        message: "",
      },
      true,
    );
    expect(display.key).toBe("running");
    expect(display.label).toBe("Đang ghép");
  });

  it("shows probing label while folder durations load", () => {
    const display = resolveMixRowDisplay(
      readyRow,
      0,
      videos,
      undefined,
      false,
      buildMixValidationContext({ loading: false, probingDurations: true }),
    );
    expect(display.key).toBe("loading");
    expect(display.label).toBe("Đang đọc thời lượng…");
  });
});
