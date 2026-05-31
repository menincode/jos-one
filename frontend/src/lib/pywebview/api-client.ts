import {
  BridgeNotReadyError,
  NotInDesktopError,
  PythonApiError,
} from "@/lib/pywebview/errors";
import { isPywebviewShell, waitForPywebviewReady } from "@/lib/pywebview/readiness";
import { signInWithUsernameHttp } from "@/lib/auth/login-http";
import { DEFAULT_EXPORT_SETTINGS } from "@/features/video-merge/video-merge-export-types";
import type {
  AppInfo,
  BridgeClient,
  BridgeFfmpegStatus,
  BridgeLoginFailure,
  BridgeLoginSettings,
  BridgeLoginUser,
  BridgeRemoveWatermarkSettings,
  BridgeVideoMergeSettings,
  FolderDialogResult,
  ListVideosResult,
  MixRowBridgePayload,
  PingResult,
  PyWebViewApi,
  StartVideoMergeJobResult,
  ValidateMergeFoldersResult,
  VideoMergeJobStatusResult,
  WatermarkProgressSnapshot,
  WatermarkVideoRow,
  WatermarkVideoRowRecord,
} from "@/lib/pywebview/types";
import {
  EXPECTED_BRIDGE_API_VERSION,
  isBridgeLoginFailure,
} from "@/lib/pywebview/types";

function mapWatermarkRow(row: WatermarkVideoRow): WatermarkVideoRowRecord {
  return {
    fileName: typeof row.file_name === "string" ? row.file_name : "",
    inputPath: typeof row.input_path === "string" ? row.input_path : "",
    outputPath: typeof row.output_path === "string" ? row.output_path : "",
    status: typeof row.status === "string" ? row.status : "pending",
    progressPct: typeof row.progress_pct === "number" ? row.progress_pct : 0,
  };
}

function wrapApiError(err: unknown): never {
  if (err instanceof Error) {
    throw new PythonApiError(err.message, err.stack);
  }
  throw new PythonApiError(String(err));
}

function mockListVideosInFolder(folder: string): ListVideosResult {
  if (!folder.trim()) {
    return {
      ok: false,
      path: "",
      message: "Thư mục trống",
      videos: [],
    };
  }
  const base = folder.replace(/\\/g, "/").replace(/\/$/, "");
  return {
    ok: true,
    path: folder,
    message: "",
    videos: [
      {
        name: "intro.mp4",
        path: `${base}/intro.mp4`,
        size_bytes: 12_400_000,
        duration_sec: null,
      },
      {
        name: "scene-01.mov",
        path: `${base}/scene-01.mov`,
        size_bytes: 48_200_000,
        duration_sec: null,
      },
      {
        name: "outro.webm",
        path: `${base}/outro.webm`,
        size_bytes: 8_100_000,
        duration_sec: null,
      },
    ],
  };
}

function createMockClient(): BridgeClient {
  if (import.meta.env.DEV) {
    console.warn(
      "[pywebview] Browser-only mode: bridge calls are mocked. Use make dev or make start for real bridge.",
    );
  }
  return {
    ping: async (name: string) => ({ message: `[mock] pong, ${name}!` }),
    getAppInfo: async () => ({
      title: "JOS One (mock)",
      env: "browser",
      bridge_api_version: EXPECTED_BRIDGE_API_VERSION,
    }),
    login: (username: string, password: string) =>
      signInWithUsernameHttp(username, password),
    openFolderDialog: async (directory?: string) => ({
      ok: true,
      path: directory?.trim() || "C:\\Videos\\demo-output",
      message: "",
    }),
    openInputFolderDialog: async (directory?: string) => ({
      ok: true,
      path: directory?.trim() || "C:\\Videos\\demo-input",
      message: "",
    }),
    openOutputFolderDialog: async (directory?: string) => ({
      ok: true,
      path: directory?.trim() || "C:\\Videos\\demo-output",
      message: "",
    }),
    validateMergeFolders: async (inputFolder: string, outputFolder: string) => {
      const input_ok = Boolean(inputFolder.trim());
      const output_ok = Boolean(outputFolder.trim());
      return {
        ok: input_ok && output_ok,
        input_ok,
        output_ok,
        message:
          input_ok && output_ok
            ? ""
            : "Chọn đủ thư mục đầu vào và đầu ra (mock).",
      };
    },
    openFolderInExplorer: async (folder: string) => {
      if (!folder.trim()) {
        return { ok: false, path: "", message: "Thư mục trống" };
      }
      return { ok: true, path: folder, message: "[mock] opened in explorer" };
    },
    openMediaFile: async (filePath: string) => {
      if (!filePath.trim()) {
        return { ok: false, path: "", message: "Đường dẫn file trống" };
      }
      return { ok: true, path: filePath, message: "[mock] opened media" };
    },
    openImageFileDialog: async () => ({
      ok: true,
      path: "C:\\Assets\\logo.png",
      message: "",
    }),
    listVideosInFolder: async (folder: string) => mockListVideosInFolder(folder),
    probeVideosInFolder: async (folder: string) => {
      const listed = mockListVideosInFolder(folder);
      if (!listed.ok) return listed;
      return {
        ...listed,
        videos: listed.videos.map((v, i) => ({
          ...v,
          duration_sec: [125.5, 48, 312][i] ?? 60,
        })),
      };
    },
    getFfmpegStatus: async () => ({
      ready: false,
      ffmpeg_path: "",
      ffprobe_path: "",
      storage_dir: "",
    }),
    getLoginSettings: async () => ({
      remember_account: false,
      username: "",
      password: "",
    }),
    saveLoginSettings: async (
      remember_account: boolean,
      username: string,
      password: string,
    ) => ({
      remember_account,
      username: remember_account ? username.trim() : "",
      password: remember_account ? password : "",
    }),
    getVideoMergeSettings: async () => ({
      input_folder: "",
      output_folder: "",
      export_settings: { ...DEFAULT_EXPORT_SETTINGS },
    }),
    saveVideoMergeSettings: async (
      input_folder: string,
      output_folder: string,
      export_settings: Record<string, string>,
      mix_rows?: MixRowBridgePayload[],
    ) => ({
      input_folder: input_folder.trim(),
      output_folder: output_folder.trim(),
      export_settings,
      mix_rows,
    }),
    startVideoMergeJob: async () => ({
      ok: true,
      message: "[mock] merge started",
    }),
    getVideoMergeJobStatus: async () => ({
      status: "done" as const,
      message: "[mock] done",
      progress: 1,
      total: 1,
      outputs: [],
      row_states: {},
    }),
    cancelVideoMergeJob: async () => ({ ok: true, message: "" }),
    resetVideoMergeJobDisplay: async () => ({ ok: true, message: "" }),
    getRemoveWatermarkSettings: async () => ({
      input_folder: "",
      output_folder: "",
      thread_count: 4,
    }),
    saveRemoveWatermarkSettings: async (
      input_folder: string,
      output_folder: string,
      thread_count: number,
    ) => ({
      input_folder: input_folder.trim(),
      output_folder: output_folder.trim(),
      thread_count,
    }),
    listWatermarkVideosInFolder: async (input_folder: string) => {
      const listed = mockListVideosInFolder(input_folder);
      if (!listed.ok) return [];
      return listed.videos.map((v) =>
        mapWatermarkRow({
          file_name: v.name,
          input_path: v.path,
          output_path: `${input_folder.replace(/[/\\]+$/, "")}\\out\\${v.name}`,
          status: "pending",
          progress_pct: 0,
        }),
      );
    },
    removeWatermarkBatch: async (videos) =>
      videos.map((v) =>
        mapWatermarkRow({
          file_name: v.file_name,
          input_path: v.input_path,
          output_path: v.output_path,
          status: "completed",
          progress_pct: 100,
        }),
      ),
    getRemoveWatermarkProgress: async () => [],
    cancelRemoveWatermarkBatch: async () => true,
    call: async <T>() => ({}) as T,
  };
}

function createRealClient(api: PyWebViewApi): BridgeClient {
  const call = async <T>(
    method: keyof PyWebViewApi,
    ...args: unknown[]
  ): Promise<T> => {
    try {
      const fn = api[method] as (...a: unknown[]) => Promise<T>;
      return await fn(...args);
    } catch (err) {
      wrapApiError(err);
    }
  };

  return {
    ping: (name: string) => call<PingResult>("ping", name),
    getAppInfo: () => call<AppInfo>("get_app_info"),
    login: async (username: string, password: string) => {
      const result = await call<BridgeLoginUser | BridgeLoginFailure>(
        "login",
        username,
        password,
      );
      if (isBridgeLoginFailure(result)) {
        throw new PythonApiError(result.message);
      }
      return result;
    },
    openFolderDialog: (directory = "") =>
      call<FolderDialogResult>("open_folder_dialog", directory),
    openInputFolderDialog: (directory = "") =>
      call<FolderDialogResult>("open_input_folder_dialog", directory),
    openOutputFolderDialog: (directory = "") =>
      call<FolderDialogResult>("open_output_folder_dialog", directory),
    validateMergeFolders: (inputFolder: string, outputFolder: string) =>
      call<ValidateMergeFoldersResult>(
        "validate_merge_folders",
        inputFolder,
        outputFolder,
      ),
    listVideosInFolder: (folder: string) =>
      call<ListVideosResult>("list_videos_in_folder", folder),
    probeVideosInFolder: (folder: string) =>
      call<ListVideosResult>("probe_videos_in_folder", folder),
    openFolderInExplorer: (folder: string) =>
      call<FolderDialogResult>("open_folder_in_explorer", folder),
    openMediaFile: (filePath: string) =>
      call<FolderDialogResult>("open_media_file", filePath),
    openImageFileDialog: (directory = "") =>
      call<FolderDialogResult>("open_image_file_dialog", directory),
    getFfmpegStatus: () => call<BridgeFfmpegStatus>("get_ffmpeg_status"),
    getLoginSettings: () => call<BridgeLoginSettings>("get_login_settings"),
    saveLoginSettings: (remember_account: boolean, username: string, password: string) =>
      call<BridgeLoginSettings>(
        "save_login_settings",
        remember_account,
        username,
        password,
      ),
    getVideoMergeSettings: () =>
      call<BridgeVideoMergeSettings>("get_video_merge_settings"),
    saveVideoMergeSettings: (
      input_folder: string,
      output_folder: string,
      export_settings: Record<string, string>,
      mix_rows?: MixRowBridgePayload[],
    ) =>
      call<BridgeVideoMergeSettings>(
        "save_video_merge_settings",
        input_folder,
        output_folder,
        export_settings,
        mix_rows,
      ),
    startVideoMergeJob: (
      input_folder: string,
      output_folder: string,
      mix_rows: MixRowBridgePayload[],
      export_settings: Record<string, string>,
      folder_videos?: Array<Record<string, unknown>>,
    ) =>
      call<StartVideoMergeJobResult>(
        "start_video_merge_job",
        input_folder,
        output_folder,
        mix_rows,
        export_settings,
        folder_videos ?? [],
      ),
    getVideoMergeJobStatus: () =>
      call<VideoMergeJobStatusResult>("get_video_merge_job_status"),
    cancelVideoMergeJob: () =>
      call<StartVideoMergeJobResult>("cancel_video_merge_job"),
    resetVideoMergeJobDisplay: () =>
      call<StartVideoMergeJobResult>("reset_video_merge_job_display"),
    getRemoveWatermarkSettings: () =>
      call<BridgeRemoveWatermarkSettings>("get_remove_watermark_settings"),
    saveRemoveWatermarkSettings: (
      input_folder: string,
      output_folder: string,
      thread_count: number,
    ) =>
      call<BridgeRemoveWatermarkSettings>(
        "save_remove_watermark_settings",
        input_folder,
        output_folder,
        thread_count,
      ),
    listWatermarkVideosInFolder: async (input_folder: string, output_folder?: string) => {
      const rows = await call<WatermarkVideoRow[]>(
        "list_watermark_videos_in_folder",
        input_folder,
        output_folder,
      );
      return Array.isArray(rows) ? rows.map(mapWatermarkRow) : [];
    },
    removeWatermarkBatch: async (videos, thread_count) => {
      const payload = videos.map((v) => ({
        file_name: v.file_name,
        input_path: v.input_path,
        output_path: v.output_path,
      }));
      const rows = await call<WatermarkVideoRow[]>(
        "remove_watermark_batch",
        payload,
        Math.max(1, Math.min(32, Math.floor(thread_count || 1))),
      );
      return Array.isArray(rows) ? rows.map(mapWatermarkRow) : [];
    },
    getRemoveWatermarkProgress: async () => {
      const rows = await call<WatermarkProgressSnapshot[]>("get_remove_watermark_progress");
      if (!Array.isArray(rows)) return [];
      return rows.map((row) => ({
        input_path: typeof row.input_path === "string" ? row.input_path : "",
        progress_pct: typeof row.progress_pct === "number" ? row.progress_pct : 0,
      }));
    },
    cancelRemoveWatermarkBatch: async () => {
      const res = await call<{ ok?: boolean }>("cancel_remove_watermark_batch");
      return res?.ok === true;
    },
    call,
  };
}

let bridgeClientPromise: Promise<BridgeClient> | null = null;

async function createBridgeClientOnce(): Promise<BridgeClient> {
  await waitForPywebviewReady();
  const api = window.pywebview?.api;
  if (!api) {
    throw new BridgeNotReadyError();
  }

  const client = createRealClient(api);
  const info = await client.getAppInfo();
  if (info.bridge_api_version !== EXPECTED_BRIDGE_API_VERSION) {
    console.warn(
      `Bridge API version mismatch: expected ${EXPECTED_BRIDGE_API_VERSION}, got ${info.bridge_api_version}`,
    );
  }
  return client;
}

export async function createBridgeClient(): Promise<BridgeClient> {
  if (!isPywebviewShell()) {
    return createMockClient();
  }

  if (!bridgeClientPromise) {
    bridgeClientPromise = createBridgeClientOnce().catch((err) => {
      bridgeClientPromise = null;
      throw err;
    });
  }
  return bridgeClientPromise;
}

export function assertDesktop(): void {
  if (!isPywebviewShell()) {
    throw new NotInDesktopError();
  }
}
