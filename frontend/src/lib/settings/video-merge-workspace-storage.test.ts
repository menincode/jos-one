import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  loadFolderVideosFromWorkspace,
  loadVideoMergeWorkspace,
  migrateDefaultWorkspaceToUser,
  persistFolderVideosToWorkspace,
  persistMixRowsToWorkspace,
  saveVideoMergeWorkspace,
} from "@/lib/settings/video-merge-workspace-storage";

describe("video-merge-workspace-storage", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "jos.auth.user",
      JSON.stringify({ id: 7, username: "demo" }),
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("persists mix rows and folder videos per user", () => {
    persistMixRowsToWorkspace([{ id: "r1", leading_paths: ["/a.mp4"] }]);
    persistFolderVideosToWorkspace("D:\\in", [
      { name: "a.mp4", path: "/a.mp4", size_bytes: 1, duration_sec: 12 },
    ]);

    const workspace = loadVideoMergeWorkspace();
    expect(workspace.mix_rows).toHaveLength(1);
    expect(loadFolderVideosFromWorkspace("D:\\in")).toHaveLength(1);
  });

  it("migrates default workspace to user after sign-in", () => {
    persistMixRowsToWorkspace([{ id: "r1", leading_paths: ["/a.mp4"] }], "default");
    migrateDefaultWorkspaceToUser("7");
    expect(loadVideoMergeWorkspace("7").mix_rows).toHaveLength(1);
    expect(loadVideoMergeWorkspace("default").mix_rows).toHaveLength(1);
  });

  it("scopes storage by user id", () => {
    saveVideoMergeWorkspace(
      { mix_rows: [{ id: "u2", leading_paths: [] }], videos_by_folder: {} },
      "user-2",
    );
    expect(loadVideoMergeWorkspace("user-2").mix_rows[0]?.id).toBe("u2");
    expect(loadVideoMergeWorkspace("user-7").mix_rows).toHaveLength(0);
  });
});
