import { describe, expect, it } from "vitest";

import {
  canShowMixVideoTable,
  getMergeFolderBlockingHint,
  mergeFoldersReady,
} from "@/features/video-merge/merge-folder-validation";

describe("merge-folder-validation", () => {
  it("shows mix table when videos are listed even if inputExists is false", () => {
    expect(
      canShowMixVideoTable("D:\\videos", 16, {
        checking: false,
        inputFilled: true,
        outputFilled: false,
        inputExists: false,
        outputExists: false,
      }),
    ).toBe(true);
  });

  it("shows mix table when input validated without videos yet", () => {
    expect(
      canShowMixVideoTable("D:\\videos", 0, {
        checking: false,
        inputFilled: true,
        outputFilled: false,
        inputExists: true,
        outputExists: false,
      }),
    ).toBe(true);
  });

  it("hides mix table while checking and no videos", () => {
    expect(
      canShowMixVideoTable("D:\\videos", 0, {
        checking: true,
        inputFilled: true,
        outputFilled: false,
        inputExists: false,
        outputExists: false,
      }),
    ).toBe(false);
  });

  it("blocks until both folders exist", () => {
    expect(
      getMergeFolderBlockingHint({
        checking: false,
        inputFilled: true,
        outputFilled: true,
        inputExists: true,
        outputExists: false,
      }),
    ).toBe("Thư mục đầu ra không tồn tại");
    expect(
      mergeFoldersReady({
        checking: false,
        inputFilled: true,
        outputFilled: true,
        inputExists: true,
        outputExists: true,
      }),
    ).toBe(true);
  });
});
