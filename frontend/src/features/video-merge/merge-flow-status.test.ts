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

  it("syncs header label with active row concat encode progress", () => {
    const result = resolveMergeFlowStatus({
      mergeStatus: "running",
      canStartMerge: false,
      jobMessage: "Đang chuẩn bị…",
      jobProgress: 0,
      jobTotal: 5,
      rowJobStates: {
        "row-1": {
          status: "running",
          phase: "concat",
          message: "Ghép video · 2.5x · 01:23",
        },
      },
    });
    expect(result.key).toBe("merging");
    expect(result.label).toBe("Ghép video · 2.5x · 01:23");
    expect(result.showDetailInfo).toBe(true);
  });

  it("shows mix_video preparing label from active row state", () => {
    const result = resolveMergeFlowStatus({
      mergeStatus: "running",
      canStartMerge: false,
      jobMessage: "Đang chuẩn bị…",
      rowJobStates: {
        "row-1": {
          status: "running",
          phase: "mix_video",
          message: "Mix video",
        },
      },
    });
    expect(result.key).toBe("preparing");
    expect(result.label).toBe("Mix video");
  });

  it("shows short invalid_mix label with detail message", () => {
    const result = resolveMergeFlowStatus({
      mergeStatus: "idle",
      canStartMerge: false,
      startHint: "Thêm ít nhất một dòng mix.",
    });
    expect(result.key).toBe("invalid_mix");
    expect(result.label).toBe("Chưa hợp lệ");
    expect(result.detailMessage).toBe("Thêm ít nhất một dòng mix.");
    expect(result.showDetailInfo).toBe(true);
  });
});
