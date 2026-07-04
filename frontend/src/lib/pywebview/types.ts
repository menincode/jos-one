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
  /** Auth API scopes when returned by bridge (optional). */
  scopes?: unknown;
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
  /** Video stream width from ffprobe (pixels). */
  width?: number | null;
  /** Video stream height from ffprobe (pixels). */
  height?: number | null;
}

export interface ListVideosResult {
  ok: boolean;
  path: string;
  message: string;
  videos: VideoFileItem[];
}

export interface BridgeAppSettings {
  enable_custom_bitrate: boolean;
  custom_video_bitrate: number;
  custom_audio_bitrate: number;
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
  /** Clip count after mix planner (leading + tail). */
  mix_clip_count?: number | null;
  /** Sum of source clip durations in planned sequence (seconds). */
  mix_total_duration_sec?: number | null;
  /** YouTube-style chapter timestamps for all clips in the mix (after successful merge). */
  chaptime?: string;
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
  zoom_percent: number;
}

export interface GoogleSheetRowsResult {
  ok: boolean;
  rows: string[][];
  message: string;
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
  fetch_google_sheet_rows: (url: string) => Promise<GoogleSheetRowsResult>;
  open_folder_in_explorer: (folder: string) => Promise<FolderDialogResult>;
  open_media_file: (file_path: string) => Promise<FolderDialogResult>;
  open_image_file_dialog: (directory?: string) => Promise<FolderDialogResult>;
  login: (username: string, password: string) => Promise<BridgeLoginUser>;
  get_ffmpeg_status: () => Promise<BridgeFfmpegStatus>;
  get_app_settings: () => Promise<BridgeAppSettings>;
  save_app_settings: (
    enable_custom_bitrate: boolean,
    custom_video_bitrate: number,
    custom_audio_bitrate: number,
  ) => Promise<BridgeAppSettings>;
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
    folder_videos?: Array<Record<string, unknown>>,
  ) => Promise<StartVideoMergeJobResult>;
  get_video_merge_job_status: () => Promise<VideoMergeJobStatusResult>;
  cancel_video_merge_job: () => Promise<StartVideoMergeJobResult>;
  reset_video_merge_job_display: () => Promise<StartVideoMergeJobResult>;
  get_remove_watermark_settings: () => Promise<BridgeRemoveWatermarkSettings>;
  save_remove_watermark_settings: (
    input_folder: string,
    output_folder: string,
    thread_count: number,
    zoom_percent: number,
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
      zoom_percent?: number;
    }>,
    thread_count: number,
  ) => Promise<WatermarkVideoRow[]>;
  get_remove_watermark_progress: () => Promise<WatermarkProgressSnapshot[]>;
  cancel_remove_watermark_batch: () => Promise<{ ok: boolean }>;
  open_video_file_dialog: (directory: string) => Promise<FolderDialogResult>;
  get_video_loop_settings: () => Promise<BridgeVideoLoopSettings>;
  save_video_loop_settings: (
    input_folder: string,
    output_folder: string,
    loop_count: number,
    thread_count: number,
  ) => Promise<BridgeVideoLoopSettings>;
  start_video_loop_job: (
    input_folder: string,
    output_folder: string,
    loop_count: number,
    thread_count: number,
  ) => Promise<{ ok: boolean; message: string }>;
  get_video_loop_job_status: () => Promise<BridgeVideoLoopJobStatus>;
  cancel_video_loop_job: () => Promise<{ ok: boolean }>;
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
  fetchGoogleSheetRows: (url: string) => Promise<GoogleSheetRowsResult>;
  openFolderInExplorer: (folder: string) => Promise<FolderDialogResult>;
  openMediaFile: (file_path: string) => Promise<FolderDialogResult>;
  openImageFileDialog: (directory?: string) => Promise<FolderDialogResult>;
  login: (username: string, password: string) => Promise<BridgeLoginUser>;
  getFfmpegStatus: () => Promise<BridgeFfmpegStatus>;
  getAppSettings: () => Promise<BridgeAppSettings>;
  saveAppSettings: (
    enable_custom_bitrate: boolean,
    custom_video_bitrate: number,
    custom_audio_bitrate: number,
  ) => Promise<BridgeAppSettings>;
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
    folder_videos?: Array<Record<string, unknown>>,
  ) => Promise<StartVideoMergeJobResult>;
  getVideoMergeJobStatus: () => Promise<VideoMergeJobStatusResult>;
  cancelVideoMergeJob: () => Promise<StartVideoMergeJobResult>;
  resetVideoMergeJobDisplay: () => Promise<StartVideoMergeJobResult>;
  getRemoveWatermarkSettings: () => Promise<BridgeRemoveWatermarkSettings>;
  saveRemoveWatermarkSettings: (
    input_folder: string,
    output_folder: string,
    thread_count: number,
    zoom_percent: number,
  ) => Promise<BridgeRemoveWatermarkSettings>;
  listWatermarkVideosInFolder: (
    input_folder: string,
    output_folder?: string,
  ) => Promise<WatermarkVideoRowRecord[]>;
  removeWatermarkBatch: (
    videos: Array<{
      file_name: string;
      input_path: string;
      output_path: string;
      zoom_percent?: number;
    }>,
    thread_count: number,
  ) => Promise<WatermarkVideoRowRecord[]>;
  getRemoveWatermarkProgress: () => Promise<WatermarkProgressSnapshot[]>;
  cancelRemoveWatermarkBatch: () => Promise<boolean>;
  openVideoFileDialog: (directory?: string) => Promise<FolderDialogResult>;
  getVideoLoopSettings: () => Promise<BridgeVideoLoopSettings>;
  saveVideoLoopSettings: (
    input_folder: string,
    output_folder: string,
    loop_count: number,
    thread_count: number,
  ) => Promise<BridgeVideoLoopSettings>;
  startVideoLoopJob: (
    input_folder: string,
    output_folder: string,
    loop_count: number,
    thread_count: number,
  ) => Promise<{ ok: boolean; message: string }>;
  getVideoLoopJobStatus: () => Promise<BridgeVideoLoopJobStatus>;
  cancelVideoLoopJob: () => Promise<{ ok: boolean }>;
  call: <T>(method: keyof PyWebViewApi, ...args: unknown[]) => Promise<T>;
}

export type WatermarkVideoRowRecord = {
  fileName: string;
  inputPath: string;
  outputPath: string;
  status: string;
  progressPct: number;
};

export interface BridgeVideoLoopSettings {
  input_folder: string;
  output_folder: string;
  loop_count: number;
  thread_count: number;
}

export type VideoLoopJobStatus = "idle" | "running" | "done" | "error" | "cancelled";

export type VideoLoopFileRowStatus = "pending" | "running" | "done" | "error" | "cancelled";

export interface VideoLoopFileStatus {
  file_name: string;
  input_path: string;
  status: VideoLoopFileRowStatus;
  progress_pct: number;
  output_path: string;
  speed_x: number | null;
}

export interface BridgeVideoLoopJobStatus {
  status: VideoLoopJobStatus;
  message: string;
  progress: number;
  output_path: string;
  speed_x: number | null;
  total_files: number;
  done_files: number;
  file_statuses: VideoLoopFileStatus[];
}

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
