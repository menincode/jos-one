import { describe, expect, it } from "vitest";

import { resolveMixRowPipelineLabel } from "@/features/video-merge/mix-row-pipeline-phase";
import { runningStatusShortLabel } from "@/features/video-merge/mix-row-job-status";

describe("mix-row-pipeline-phase", () => {
  it("maps normalize phase with clip index", () => {
    expect(
      resolveMixRowPipelineLabel(
        "normalize",
        "Chuẩn hóa · Clip 2/5: a.mp4 · 3.0x · 00:10",
      ),
    ).toBe("Chuẩn hóa 2/5");
  });

  it("maps concat phase to Ghép video label", () => {
    expect(
      resolveMixRowPipelineLabel("concat", "Ghép video · 2.0x · 00:05"),
    ).toBe("Ghép video");
  });

  it("prefers bridge phase in runningStatusShortLabel", () => {
    expect(
      runningStatusShortLabel(
        "Chuẩn hóa · Clip 1/3: clip.mp4 · 2.0x · 00:01",
        "normalize",
      ),
    ).toBe("Chuẩn hóa 1/3");
  });
});
