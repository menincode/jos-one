import { describe, expect, it } from "vitest";

import {
  buildMixOutputFilePath,
  canPreviewMixRow,
  resolveMixPreviewPath,
} from "@/features/video-merge/mix-output-path";

describe("buildMixOutputFilePath", () => {
  it("builds Windows-style path", () => {
    expect(buildMixOutputFilePath("D:\\out\\", "abc-123", "mp4")).toBe(
      "D:\\out\\mix-abc-123.mp4",
    );
  });

  it("builds posix path", () => {
    expect(buildMixOutputFilePath("/tmp/out", "row-1", "mkv")).toBe(
      "/tmp/out/mix-row-1.mkv",
    );
  });
});

describe("canPreviewMixRow", () => {
  it("is true when job output succeeded", () => {
    expect(
      canPreviewMixRow("r1", [
        { row_id: "r1", ok: true, path: "D:\\out\\mix-r1.mp4", message: "" },
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
        [{ row_id: "r1", ok: true, path: "D:\\out\\mix-r1.mp4", message: "" }],
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

  it("falls back to default output filename", () => {
    const path = resolveMixPreviewPath("r2", "D:\\out", "mp4", []);
    expect(path).toBe("D:\\out\\mix-r2.mp4");
  });
});
