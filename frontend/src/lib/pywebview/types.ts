export const EXPECTED_BRIDGE_API_VERSION = "1";

export interface PingResult {
  message: string;
}

export interface AppInfo {
  title: string;
  env: string;
  bridge_api_version: string;
}

export interface BridgeLoginUser {
  id: number;
  username: string;
  role: string | null;
  status: boolean;
  notes: string | null;
  created_at: string;
}

/** Returned by pywebview `login` on expected auth failure (no bridge exception). */
export interface BridgeLoginFailure {
  ok: false;
  message: string;
}

export type BridgeLoginResult = BridgeLoginUser | BridgeLoginFailure;

export function isBridgeLoginFailure(
  result: BridgeLoginResult,
): result is BridgeLoginFailure {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    result.ok === false &&
    typeof result.message === "string"
  );
}

export interface FolderDialogResult {
  ok: boolean;
  path: string;
  message: string;
}

export interface VideoFileItem {
  name: string;
  path: string;
  size_bytes: number;
  duration_sec: number | null;
  /** Parsed from ``ffmpeg -i`` stderr (Duration: line). */
  duration_ffmpeg_sec?: number | null;
}

export interface ListVideosResult {
  ok: boolean;
  path: string;
  message: string;
  videos: VideoFileItem[];
}

export interface BridgeLoginSettings {
  remember_account: boolean;
  username: string;
  password: string;
}

export interface MixRowBridgePayload {
  id: string;
  leading_paths: string[];
}

export interface BridgeVideoMergeSettings {
  input_folder: string;
  output_folder: string;
  export_settings: Record<string, string>;
  mix_rows?: MixRowBridgePayload[];
}

export type VideoMergeJobStatus = "idle" | "running" | "done" | "error" | "cancelled";

export type VideoMergeRowJobStatus =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "cancelled";

/** Row pipeline step while status is ``running`` (see mix-row-pipeline-phase.ts). */
export type VideoMergeRowPipelinePhase =
  | "processing"
  | "mix_video"
  | "normalize"
  | "concat";

export interface VideoMergeRowJobState {
  status: VideoMergeRowJobStatus;
  message: string;
  /** Pipeline step: processing → mix_video → normalize → concat. */
  phase?: VideoMergeRowPipelinePhase | string;
  /** Live FFmpeg encode time from stderr (updates while status is running). */
  output_duration_sec?: number | null;
  /** Live FFmpeg encode speed from stderr (``speed=4.41x``). */
  output_speed_x?: number | null;
}

export interface VideoMergeJobOutput {
  row_id: string;
  ok: boolean;
  /** Absolute filesystem path when ok=true; used for preview via openMediaFile. */
  path: string;
  message: string;
  /** Output file duration from FFmpeg log / ``ffmpeg -i`` on result. */
  output_duration_sec?: number | null;
  /** Last FFmpeg encode speed from render log (``speed=4.41x``). */
  output_speed_x?: number | null;
}

export interface VideoMergeJobStatusResult {
  status: VideoMergeJobStatus;
  message: string;
  progress: number;
  total: number;
  outputs: VideoMergeJobOutput[];
  row_states: Record<string, VideoMergeRowJobState>;
}

export interface StartVideoMergeJobResult {
  ok: boolean;
  message: string;
}

export interface ValidateMergeFoldersResult {
  ok: boolean;
  input_ok: boolean;
  output_ok: boolean;
  message: string;
}

export interface WatermarkVideoRow {
  file_name: string;
  input_path: string;
  output_path: string;
  status: string;
  progress_pct: number;
}

export interface WatermarkProgressSnapshot {
  input_path: string;
  progress_pct: number;
}

export interface BridgeRemoveWatermarkSettings {
  input_folder: string;
  output_folder: string;
  thread_count: number;
}

export interface PyWebViewApi {
  ping: (name: string) => Promise<PingResult>;
  get_app_info: () => Promise<AppInfo>;
  open_path_dialog: () => Promise<FolderDialogResult>;
  open_folder_dialog: (directory?: string) => Promise<FolderDialogResult>;
  open_input_folder_dialog: (directory?: string) => Promise<FolderDialogResult>;
  open_output_folder_dialog: (directory?: string) => Promise<FolderDialogResult>;
  validate_merge_folders: (
    input_folder: string,
    output_folder: string,
  ) => Promise<ValidateMergeFoldersResult>;
  list_videos_in_folder: (folder: string) => Promise<ListVideosResult>;
  probe_videos_in_folder: (folder: string) => Promise<ListVideosResult>;
  open_folder_in_explorer: (folder: string) => Promise<FolderDialogResult>;
  open_media_file: (file_path: string) => Promise<FolderDialogResult>;
  open_image_file_dialog: (directory?: string) => Promise<FolderDialogResult>;
  login: (username: string, password: string) => Promise<BridgeLoginUser>;
  get_ffmpeg_status: () => Promise<BridgeFfmpegStatus>;
  get_login_settings: () => Promise<BridgeLoginSettings>;
  save_login_settings: (
    remember_account: boolean,
    username: string,
    password: string,
  ) => Promise<BridgeLoginSettings>;
  get_video_merge_settings: () => Promise<BridgeVideoMergeSettings>;
  save_video_merge_settings: (
    input_folder: string,
    output_folder: string,
    export_settings: Record<string, string>,
    mix_rows?: MixRowBridgePayload[],
  ) => Promise<BridgeVideoMergeSettings>;
  start_video_merge_job: (
    input_folder: string,
    output_folder: string,
    mix_rows: MixRowBridgePayload[],
    export_settings: Record<string, string>,
  ) => Promise<StartVideoMergeJobResult>;
  get_video_merge_job_status: () => Promise<VideoMergeJobStatusResult>;
  cancel_video_merge_job: () => Promise<StartVideoMergeJobResult>;
  get_remove_watermark_settings: () => Promise<BridgeRemoveWatermarkSettings>;
  save_remove_watermark_settings: (
    input_folder: string,
    output_folder: string,
    thread_count: number,
  ) => Promise<BridgeRemoveWatermarkSettings>;
  list_watermark_videos_in_folder: (
    input_folder: string,
    output_folder?: string,
  ) => Promise<WatermarkVideoRow[]>;
  remove_watermark_batch: (
    videos: Array<{
      file_name: string;
      input_path: string;
      output_path: string;
      bbox_pixels?: [number, number, number, number];
    }>,
    thread_count: number,
  ) => Promise<WatermarkVideoRow[]>;
  get_remove_watermark_progress: () => Promise<WatermarkProgressSnapshot[]>;
  cancel_remove_watermark_batch: () => Promise<{ ok: boolean }>;
}

export interface BridgeFfmpegStatus {
  ready: boolean;
  ffmpeg_path: string;
  ffprobe_path: string;
  storage_dir: string;
}

export interface BridgeClient {
  ping: (name: string) => Promise<PingResult>;
  getAppInfo: () => Promise<AppInfo>;
  openFolderDialog: (directory?: string) => Promise<FolderDialogResult>;
  openInputFolderDialog: (directory?: string) => Promise<FolderDialogResult>;
  openOutputFolderDialog: (directory?: string) => Promise<FolderDialogResult>;
  validateMergeFolders: (
    inputFolder: string,
    outputFolder: string,
  ) => Promise<ValidateMergeFoldersResult>;
  listVideosInFolder: (folder: string) => Promise<ListVideosResult>;
  probeVideosInFolder: (folder: string) => Promise<ListVideosResult>;
  openFolderInExplorer: (folder: string) => Promise<FolderDialogResult>;
  openMediaFile: (file_path: string) => Promise<FolderDialogResult>;
  openImageFileDialog: (directory?: string) => Promise<FolderDialogResult>;
  login: (username: string, password: string) => Promise<BridgeLoginUser>;
  getFfmpegStatus: () => Promise<BridgeFfmpegStatus>;
  getLoginSettings: () => Promise<BridgeLoginSettings>;
  saveLoginSettings: (
    remember_account: boolean,
    username: string,
    password: string,
  ) => Promise<BridgeLoginSettings>;
  getVideoMergeSettings: () => Promise<BridgeVideoMergeSettings>;
  saveVideoMergeSettings: (
    input_folder: string,
    output_folder: string,
    export_settings: Record<string, string>,
    mix_rows?: MixRowBridgePayload[],
  ) => Promise<BridgeVideoMergeSettings>;
  startVideoMergeJob: (
    input_folder: string,
    output_folder: string,
    mix_rows: MixRowBridgePayload[],
    export_settings: Record<string, string>,
  ) => Promise<StartVideoMergeJobResult>;
  getVideoMergeJobStatus: () => Promise<VideoMergeJobStatusResult>;
  cancelVideoMergeJob: () => Promise<StartVideoMergeJobResult>;
  getRemoveWatermarkSettings: () => Promise<BridgeRemoveWatermarkSettings>;
  saveRemoveWatermarkSettings: (
    input_folder: string,
    output_folder: string,
    thread_count: number,
  ) => Promise<BridgeRemoveWatermarkSettings>;
  listWatermarkVideosInFolder: (
    input_folder: string,
    output_folder?: string,
  ) => Promise<WatermarkVideoRow[]>;
  removeWatermarkBatch: (
    videos: Array<{
      file_name: string;
      input_path: string;
      output_path: string;
    }>,
    thread_count: number,
  ) => Promise<WatermarkVideoRow[]>;
  getRemoveWatermarkProgress: () => Promise<WatermarkProgressSnapshot[]>;
  cancelRemoveWatermarkBatch: () => Promise<boolean>;
  call: <T>(method: keyof PyWebViewApi, ...args: unknown[]) => Promise<T>;
}

export type WatermarkVideoRowRecord = {
  fileName: string;
  inputPath: string;
  outputPath: string;
  status: string;
  progressPct: number;
};

declare global {
  interface Window {
    pywebview?: {
      api?: PyWebViewApi;
      state?: Record<string, unknown>;
    };
    pywebviewready?: boolean;
  }
}

export {};
