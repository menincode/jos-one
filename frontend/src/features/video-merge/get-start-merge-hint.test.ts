import { describe, expect, it } from "vitest";

import {
  getCanOpenOutputFolder,
  getCanStartMerge,
  getStartMergeHint,
} from "@/features/video-merge/get-start-merge-hint";
import type { MergeFolderValidationState } from "@/features/video-merge/merge-folder-validation";

const readyFolders: MergeFolderValidationState = {
  checking: false,
  inputFilled: true,
  outputFilled: true,
  inputExists: true,
  outputExists: true,
};

const baseParams = {
  hydrated: true,
  settingsLoading: false,
  inputFolder: "D:\\in",
  outputFolder: "D:\\out",
  folderValidation: readyFolders,
  videos: [{ name: "a.mp4", path: "D:\\in\\a.mp4", size_bytes: 1, duration_sec: 10 }],
  loading: false,
  probingDurations: false,
  mixRows: [{ id: "1", leadingPaths: ["D:\\in\\a.mp4"] }],
  isRunning: false,
};

describe("getCanOpenOutputFolder", () => {
  it("enables when output path exists", () => {
    expect(getCanOpenOutputFolder("D:\\out", false, readyFolders)).toBe(true);
  });

  it("disables while settings load", () => {
    expect(getCanOpenOutputFolder("D:\\out", true, readyFolders)).toBe(false);
  });

  it("disables when output folder missing on disk", () => {
    expect(
      getCanOpenOutputFolder("D:\\out", false, {
        ...readyFolders,
        outputExists: false,
      }),
    ).toBe(false);
  });
});

describe("getCanStartMerge", () => {
  it("enables when folders and videos are ready", () => {
    expect(getCanStartMerge(baseParams)).toBe(true);
  });

  it("disables when mix rows are invalid", () => {
    expect(
      getCanStartMerge({
        ...baseParams,
        mixRows: [],
      }),
    ).toBe(false);
  });

  it("disables when folders are not ready", () => {
    expect(
      getCanStartMerge({
        ...baseParams,
        folderValidation: {
          ...readyFolders,
          outputExists: false,
        },
      }),
    ).toBe(false);
  });
});

describe("getStartMergeHint folder constraints", () => {
  it("requires output folder path", () => {
    expect(
      getStartMergeHint({
        ...baseParams,
        outputFolder: "",
        folderValidation: {
          checking: false,
          inputFilled: true,
          outputFilled: false,
          inputExists: true,
          outputExists: false,
        },
      }),
    ).toBe("Chọn thư mục đầu ra");
  });

  it("reports missing input folder on disk", () => {
    expect(
      getStartMergeHint({
        ...baseParams,
        folderValidation: {
          ...readyFolders,
          inputExists: false,
        },
      }),
    ).toBe("Thư mục đầu vào không tồn tại");
  });
});

describe("getStartMergeHint", () => {
  it("returns mix hint when rows invalid", () => {
    expect(
      getStartMergeHint({
        ...baseParams,
        mixRows: [],
      }),
    ).toMatch(/ít nhất một dòng/);
  });
});
