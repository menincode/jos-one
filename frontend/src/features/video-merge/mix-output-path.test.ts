import { describe, expect, it } from "vitest";

import {
  buildMixOutputFilePath,
  canPreviewMixRow,
  resolveMixPreviewPath,
} from "@/features/video-merge/mix-output-path";

describe("buildMixOutputFilePath", () => {
  const at = new Date(2026, 4, 30, 14, 7, 0);

  it("builds Windows-style path with timestamp and first video stem", () => {
    expect(
      buildMixOutputFilePath("D:\\out\\", "D:\\in\\my-clip.mp4", "mp4", at),
    ).toBe("D:\\out\\20260530_1407_my-clip.mp4");
  });

  it("builds posix path", () => {
    expect(buildMixOutputFilePath("/tmp/out", "/tmp/in/clip.mkv", "mkv", at)).toBe(
      "/tmp/out/20260530_1407_clip.mkv",
    );
  });

  it("returns empty when folder or first video missing", () => {
    expect(buildMixOutputFilePath("", "a.mp4", "mp4", at)).toBe("");
    expect(buildMixOutputFilePath("/tmp/out", "", "mp4", at)).toBe("");
  });
});

describe("canPreviewMixRow", () => {
  it("is true when job output succeeded", () => {
    expect(
      canPreviewMixRow("r1", [
        {
          row_id: "r1",
          ok: true,
          path: "D:\\out\\20260530_1407_a.mp4",
          message: "",
        },
      ]),
    ).toBe(true);
  });

  it("is false when row job state is done but no ok output", () => {
    expect(
      canPreviewMixRow("r2", [], { r2: { status: "done", message: "" } }),
    ).toBe(false);
  });

  it("is false for pending row without output", () => {
    expect(canPreviewMixRow("r3", [], { r3: { status: "pending", message: "" } })).toBe(
      false,
    );
  });

  it("is true when done row has ok output while another mix is running", () => {
    expect(
      canPreviewMixRow(
        "r1",
        [
          {
            row_id: "r1",
            ok: true,
            path: "D:\\out\\20260530_1407_a.mp4",
            message: "",
          },
        ],
        { r1: { status: "done", message: "Thời lượng xuất (FFmpeg): 10.0s" } },
      ),
    ).toBe(true);
    expect(
      canPreviewMixRow("r2", [], { r2: { status: "running", message: "Clip 1/2" } }),
    ).toBe(false);
  });

  it("is false when output exists but ok is false", () => {
    expect(
      canPreviewMixRow("r4", [
        { row_id: "r4", ok: false, path: "", message: "Lỗi ghép" },
      ], { r4: { status: "error", message: "Lỗi ghép" } }),
    ).toBe(false);
  });
});

describe("resolveMixPreviewPath", () => {
  it("prefers completed job output path", () => {
    const path = resolveMixPreviewPath("r1", "D:\\out", "mp4", [
      { row_id: "r1", ok: true, path: "D:\\out\\custom.mp4", message: "" },
    ]);
    expect(path).toBe("D:\\out\\custom.mp4");
  });

  it("returns null without job output or first video path", () => {
    expect(resolveMixPreviewPath("r2", "D:\\out", "mp4", [])).toBeNull();
  });

  it("falls back to timestamped filename when first video path is provided", () => {
    const at = new Date(2026, 4, 30, 9, 15, 0);
    const path = buildMixOutputFilePath(
      "D:\\out",
      "D:\\in\\a.mp4",
      "mp4",
      at,
    );
    expect(path).toBe("D:\\out\\20260530_0915_a.mp4");
  });
});
