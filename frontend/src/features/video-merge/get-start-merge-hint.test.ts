import { describe, expect, it } from "vitest";

import {
  getCanOpenOutputFolder,
  getCanStartMerge,
  getStartMergeHint,
} from "@/features/video-merge/get-start-merge-hint";

const baseParams = {
  hydrated: true,
  settingsLoading: false,
  inputFolder: "D:\\in",
  outputFolder: "D:\\out",
  videos: [{ name: "a.mp4", path: "D:\\in\\a.mp4", size_bytes: 1, duration_sec: 10 }],
  loading: false,
  probingDurations: false,
  mixRows: [{ id: "1", leadingPaths: ["D:\\in\\a.mp4"] }],
  isRunning: false,
};

describe("getCanOpenOutputFolder", () => {
  it("enables when output path is set", () => {
    expect(getCanOpenOutputFolder("D:\\out", false)).toBe(true);
  });

  it("disables while settings load", () => {
    expect(getCanOpenOutputFolder("D:\\out", true)).toBe(false);
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
