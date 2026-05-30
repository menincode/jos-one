import { describe, expect, it, vi } from "vitest";

import {
  canCopyChaptimeForRow,
  resolveChaptimeForRow,
} from "@/features/video-merge/mix-row-chaptime";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import {
  mixRowsFromPayload,
  mixRowsToPayload,
} from "@/features/video-merge/mix-row-types";

describe("mix-row chaptime payload", () => {
  it("round-trips chaptime on mix rows", () => {
    const rows: MixRow[] = [
      {
        id: "r1",
        leadingPaths: ["/a.mp4"],
        chaptime: "00:00 intro\n01:05 part-two",
      },
    ];
    const payload = mixRowsToPayload(rows);
    expect(payload[0]?.chaptime).toBe("00:00 intro\n01:05 part-two");
    const restored = mixRowsFromPayload(payload);
    expect(restored[0]?.chaptime).toBe("00:00 intro\n01:05 part-two");
  });
});

describe("resolveChaptimeForRow", () => {
  const row: MixRow = { id: "r1", leadingPaths: ["/a.mp4"], chaptime: "00:00 a" };

  it("prefers live job state over persisted row", () => {
    expect(
      resolveChaptimeForRow(row, { r1: { status: "done", message: "", chaptime: "00:00 live" } }),
    ).toBe("00:00 live");
  });

  it("falls back to persisted chaptime", () => {
    expect(resolveChaptimeForRow(row, {})).toBe("00:00 a");
  });

  it("canCopyChaptimeForRow is false without chaptime", () => {
    expect(canCopyChaptimeForRow({ id: "r2", leadingPaths: [] }, {})).toBe(false);
  });
});

describe("copyChaptimeToClipboard", () => {
  it("uses navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { copyChaptimeToClipboard } = await import("@/features/video-merge/mix-row-chaptime");
    const ok = await copyChaptimeToClipboard("00:00 test");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("00:00 test");
    vi.unstubAllGlobals();
  });
});
