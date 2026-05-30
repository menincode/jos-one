import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchRemoveWatermarkSettings,
  fetchVideoMergeSettings,
  persistVideoMergeWorkspace,
  preloadAppSettings,
  resetSettingsCacheForTests,
} from "@/lib/settings/app-settings-api";

const {
  mockGetVideoMergeSettings,
  mockSaveVideoMergeSettings,
  mockGetRemoveWatermarkSettings,
  mockSaveRemoveWatermarkSettings,
  isPywebviewApiReady,
  isPywebviewShell,
  waitForPywebviewReady,
} = vi.hoisted(() => ({
  mockGetVideoMergeSettings: vi.fn(),
  mockSaveVideoMergeSettings: vi.fn(),
  mockGetRemoveWatermarkSettings: vi.fn(),
  mockSaveRemoveWatermarkSettings: vi.fn(),
  isPywebviewApiReady: vi.fn(() => false),
  isPywebviewShell: vi.fn(() => true),
  waitForPywebviewReady: vi.fn<(timeoutMs?: number) => Promise<void>>(async () => undefined),
}));

vi.mock("@/lib/pywebview/api-client", () => ({
  createBridgeClient: vi.fn(async () => ({
    getLoginSettings: vi.fn(async () => ({
      remember_account: false,
      username: "",
      password: "",
    })),
    getVideoMergeSettings: mockGetVideoMergeSettings,
    saveVideoMergeSettings: mockSaveVideoMergeSettings,
    getRemoveWatermarkSettings: mockGetRemoveWatermarkSettings,
    saveRemoveWatermarkSettings: mockSaveRemoveWatermarkSettings,
  })),
}));

vi.mock("@/lib/pywebview/readiness", () => ({
  isPywebviewApiReady: () => isPywebviewApiReady(),
  isPywebviewShell: () => isPywebviewShell(),
  waitForPywebviewReady,
}));

describe("fetchVideoMergeSettings", () => {
  beforeEach(() => {
    resetSettingsCacheForTests();
    localStorage.clear();
    isPywebviewShell.mockReturnValue(true);
    isPywebviewApiReady.mockReturnValue(false);
    waitForPywebviewReady.mockRejectedValue(new Error("bridge not ready"));
    mockGetVideoMergeSettings.mockResolvedValue({
      input_folder: "D:\\saved-in",
      output_folder: "D:\\saved-out",
      export_settings: { format: "mkv", resolution: "1920x1080" },
      mix_rows: [],
    });
    mockSaveVideoMergeSettings.mockImplementation(
      async (
        input_folder: string,
        output_folder: string,
        export_settings: Record<string, string>,
        mix_rows?: unknown[],
      ) => ({
        input_folder,
        output_folder,
        export_settings,
        mix_rows: mix_rows ?? [],
      }),
    );
    mockGetRemoveWatermarkSettings.mockResolvedValue({
      input_folder: "D:\\saved-wm-in",
      output_folder: "D:\\saved-wm-out",
      thread_count: 6,
    });
    mockSaveRemoveWatermarkSettings.mockImplementation(
      async (input_folder: string, output_folder: string, thread_count: number) => ({
        input_folder: input_folder.trim(),
        output_folder: output_folder.trim(),
        thread_count,
      }),
    );
  });

  afterEach(() => {
    resetSettingsCacheForTests();
    localStorage.clear();
  });

  it("re-reads SQLite after login when early preload only had empty localStorage cache", async () => {
    localStorage.setItem(
      "jos.settings.video-merge.config",
      JSON.stringify({
        input_folder: "",
        output_folder: "",
        export_settings: {},
      }),
    );

    await preloadAppSettings();
    const stale = await fetchVideoMergeSettings();
    expect(stale.input_folder).toBe("");

    isPywebviewShell.mockReturnValue(true);
    isPywebviewApiReady.mockReturnValue(true);
    waitForPywebviewReady.mockResolvedValue(undefined);

    const fresh = await fetchVideoMergeSettings();
    expect(fresh.input_folder).toBe("D:\\saved-in");
    expect(fresh.output_folder).toBe("D:\\saved-out");
    expect(mockGetVideoMergeSettings).toHaveBeenCalled();
  });

  it("persistVideoMergeWorkspace keeps folders from SQLite when cache paths are empty", async () => {
    isPywebviewApiReady.mockReturnValue(true);
    waitForPywebviewReady.mockResolvedValue(undefined);
    localStorage.setItem(
      "jos.settings.video-merge.config",
      JSON.stringify({
        input_folder: "",
        output_folder: "",
        export_settings: {},
      }),
    );

    await preloadAppSettings();
    await persistVideoMergeWorkspace([{ id: "r1", leading_paths: ["D:\\in\\a.mp4"] }]);

    expect(mockSaveVideoMergeSettings).toHaveBeenCalledWith(
      "D:\\saved-in",
      "D:\\saved-out",
      expect.any(Object),
      [{ id: "r1", leading_paths: ["D:\\in\\a.mp4"] }],
    );
  });
});

describe("fetchRemoveWatermarkSettings", () => {
  beforeEach(() => {
    resetSettingsCacheForTests();
    localStorage.clear();
    isPywebviewShell.mockReturnValue(true);
    isPywebviewApiReady.mockReturnValue(false);
    waitForPywebviewReady.mockRejectedValue(new Error("bridge not ready"));
    mockGetRemoveWatermarkSettings.mockResolvedValue({
      input_folder: "D:\\saved-wm-in",
      output_folder: "D:\\saved-wm-out",
      thread_count: 6,
    });
  });

  afterEach(() => {
    resetSettingsCacheForTests();
    localStorage.clear();
  });

  it("re-reads SQLite after login when early preload only had empty localStorage cache", async () => {
    localStorage.setItem(
      "jos.settings.remove-watermark",
      JSON.stringify({
        input_folder: "",
        output_folder: "",
        thread_count: 4,
      }),
    );

    await preloadAppSettings();
    const stale = await fetchRemoveWatermarkSettings();
    expect(stale.input_folder).toBe("");

    isPywebviewApiReady.mockReturnValue(true);
    waitForPywebviewReady.mockResolvedValue(undefined);

    const fresh = await fetchRemoveWatermarkSettings();
    expect(fresh.input_folder).toBe("D:\\saved-wm-in");
    expect(fresh.output_folder).toBe("D:\\saved-wm-out");
    expect(fresh.thread_count).toBe(6);
    expect(mockGetRemoveWatermarkSettings).toHaveBeenCalled();
  });
});
