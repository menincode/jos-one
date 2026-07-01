import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBridgeClient } from "@/lib/pywebview/api-client";
import { waitForPywebviewReady } from "@/lib/pywebview/readiness";
import type { PyWebViewApi } from "@/lib/pywebview/types";

function stubApi(overrides: Partial<PyWebViewApi> = {}): PyWebViewApi {
  return {
    ping: vi.fn(),
    get_app_info: vi.fn(),
    open_path_dialog: vi.fn(),
    open_folder_dialog: vi.fn(),
    open_input_folder_dialog: vi.fn(),
    open_output_folder_dialog: vi.fn(),
    validate_merge_folders: vi.fn(),
    list_videos_in_folder: vi.fn(),
    probe_videos_in_folder: vi.fn(),
    open_folder_in_explorer: vi.fn(),
    open_media_file: vi.fn(),
    open_image_file_dialog: vi.fn(),
    login: vi.fn(),
    get_ffmpeg_status: vi.fn(),
    get_login_settings: vi.fn(),
    save_login_settings: vi.fn(),
    get_video_merge_settings: vi.fn(),
    save_video_merge_settings: vi.fn(),
    start_video_merge_job: vi.fn(),
    get_video_merge_job_status: vi.fn(),
    cancel_video_merge_job: vi.fn(),
    reset_video_merge_job_display: vi.fn(),
    get_remove_watermark_settings: vi.fn(),
    save_remove_watermark_settings: vi.fn(),
    list_watermark_videos_in_folder: vi.fn(),
    remove_watermark_batch: vi.fn(),
    get_remove_watermark_progress: vi.fn(),
    cancel_remove_watermark_batch: vi.fn(),
    fetch_google_sheet_rows: vi.fn(),
    open_video_file_dialog: vi.fn(),
    get_video_loop_settings: vi.fn(),
    save_video_loop_settings: vi.fn(),
    start_video_loop_job: vi.fn(),
    get_video_loop_job_status: vi.fn(),
    cancel_video_loop_job: vi.fn(),
    ...overrides,
  };
}

describe("waitForPywebviewReady", () => {
  beforeEach(() => {
    delete (window as { pywebview?: unknown }).pywebview;
    window.pywebviewready = false;
  });

  it("resolves immediately when api is already present (missed event)", async () => {
    window.pywebview = {
      api: stubApi(),
    };
    window.pywebviewready = false;

    await expect(waitForPywebviewReady(500)).resolves.toBeUndefined();
    expect(window.pywebviewready).toBe(true);
  });

  it("resolves when pywebviewready event fires", async () => {
    const api = stubApi({
      ping: vi.fn().mockResolvedValue({ message: "pong" }),
    });
    window.pywebview = { api };

    const promise = waitForPywebviewReady(1000);
    window.pywebviewready = true;
    window.dispatchEvent(new Event("pywebviewready"));
    await expect(promise).resolves.toBeUndefined();
  });
});

describe("createBridgeClient", () => {
  beforeEach(() => {
    delete (window as { pywebview?: unknown }).pywebview;
    window.pywebviewready = false;
  });

  afterEach(() => {
    delete (window as { pywebview?: unknown }).pywebview;
    window.pywebviewready = false;
  });

  it("returns mock client outside desktop", async () => {
    const client = await createBridgeClient();
    const result = await client.ping("test");
    expect(result.message).toContain("mock");
  });

  it("calls real api when pywebview is present", async () => {
    const ping = vi.fn().mockResolvedValue({ message: "pong, alice!" });
    window.pywebview = {
      api: stubApi({
        ping,
        get_app_info: vi.fn().mockResolvedValue({
          title: "T",
          env: "development",
          bridge_api_version: "1",
        }),
      }),
    };
    window.pywebviewready = true;

    const client = await createBridgeClient();
    const result = await client.ping("alice");
    expect(ping).toHaveBeenCalledWith("alice");
    expect(result.message).toBe("pong, alice!");
  });
});
