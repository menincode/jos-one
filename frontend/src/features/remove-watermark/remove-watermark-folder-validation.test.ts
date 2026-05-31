import { describe, expect, it } from "vitest";

import {
  getRemoveWatermarkFolderHint,
  getRemoveWatermarkLoadHint,
  getRemoveWatermarkStartHint,
} from "@/features/remove-watermark/remove-watermark-folder-validation";

describe("getRemoveWatermarkFolderHint", () => {
  it("requires input folder", () => {
    expect(getRemoveWatermarkFolderHint("", "D:\\out")).toBe("Chọn thư mục đầu vào");
  });

  it("requires output folder", () => {
    expect(getRemoveWatermarkFolderHint("D:\\in", "")).toBe("Chọn thư mục đầu ra");
  });

  it("returns undefined when both folders are set", () => {
    expect(getRemoveWatermarkFolderHint("D:\\in", "D:\\out")).toBeUndefined();
  });
});

describe("getRemoveWatermarkLoadHint", () => {
  it("blocks load while batch is running", () => {
    expect(getRemoveWatermarkLoadHint("D:\\in", "D:\\out", false, true)).toBe(
      "Đang xử lý video.",
    );
  });

  it("reports missing folders before load", () => {
    expect(getRemoveWatermarkLoadHint("", "D:\\out", false, false)).toBe(
      "Chọn thư mục đầu vào",
    );
  });
});

describe("getRemoveWatermarkStartHint", () => {
  it("requires folders before start", () => {
    expect(
      getRemoveWatermarkStartHint({
        settingsLoading: false,
        inputFolder: "D:\\in",
        outputFolder: "",
        eligibleCount: 3,
        busy: false,
      }),
    ).toBe("Chọn thư mục đầu ra");
  });

  it("requires loaded videos before start", () => {
    expect(
      getRemoveWatermarkStartHint({
        settingsLoading: false,
        inputFolder: "D:\\in",
        outputFolder: "D:\\out",
        eligibleCount: 0,
        busy: false,
      }),
    ).toBe("Tải danh sách video trước khi xóa watermark.");
  });
});
