import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  loadMixWorkspaceState,
  resolveMixWorkspaceUserKey,
  saveMixWorkspaceState,
} from "@/features/video-merge/mix-workspace-persist";
import type { MixRow } from "@/features/video-merge/mix-row-types";

describe("mix-workspace-persist", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("jos.auth.user", JSON.stringify({ id: 42, username: "demo" }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("saves and restores mix rows immediately on each change", () => {
    const rows: MixRow[] = [
      { id: "mix-1", leadingPaths: ["D:\\in\\a.mp4", "D:\\in\\b.mp4"] },
      { id: "mix-2", leadingPaths: ["D:\\in\\c.mp4"] },
    ];
    saveMixWorkspaceState(rows, "mix-1", resolveMixWorkspaceUserKey({ id: 42, username: "demo" }));

    const restored = loadMixWorkspaceState("42");
    expect(restored.rows).toEqual(rows);
    expect(restored.selectedMixRowId).toBe("mix-1");
  });

  it("persists empty mix list when user clears all rows", () => {
    saveMixWorkspaceState([], null, "42");
    expect(loadMixWorkspaceState("42").rows).toEqual([]);
  });
});
