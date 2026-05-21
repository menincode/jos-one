import { describe, expect, it } from "vitest";

import { resolveMergeFlowStatus } from "@/features/video-merge/merge-flow-status";

describe("resolveMergeFlowStatus", () => {
  it("shows ready with green style when idle and can start", () => {
    const result = resolveMergeFlowStatus({
      mergeStatus: "idle",
      canStartMerge: true,
    });
    expect(result.key).toBe("ready");
    expect(result.label).toBe("Sẵn sàng");
    expect(result.style.fg).toBe("#4ade80");
  });

  it("maps setup hint to needs_input_folder", () => {
    const result = resolveMergeFlowStatus({
      mergeStatus: "idle",
      canStartMerge: false,
      startHint: "Chọn thư mục đầu vào",
    });
    expect(result.key).toBe("needs_input_folder");
  });

  it("shows merging progress when job is running", () => {
    const result = resolveMergeFlowStatus({
      mergeStatus: "running",
      canStartMerge: false,
      jobProgress: 2,
      jobTotal: 5,
    });
    expect(result.key).toBe("merging");
    expect(result.label).toBe("Đang ghép 2/5…");
    expect(result.style.pulse).toBe(true);
  });

  it("shows done with success style", () => {
    const result = resolveMergeFlowStatus({
      mergeStatus: "done",
      canStartMerge: true,
      jobMessage: "Hoàn tất 3 video.",
    });
    expect(result.key).toBe("done");
    expect(result.label).toBe("Hoàn tất 3 video.");
  });
});
