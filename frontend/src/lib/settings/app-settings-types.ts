import type { MixRowPayload } from "@/features/video-merge/mix-row-types";
import type { VideoMergeExportSettings } from "@/features/video-merge/video-merge-export-types";

export interface LoginSettings {
  remember_account: boolean;
  username: string;
  password: string;
}

/** Folders + export panel — persisted in SQLite (desktop) or config localStorage (browser). */
export interface VideoMergeConfigSettings {
  input_folder: string;
  output_folder: string;
  export_settings: VideoMergeExportSettings;
}

/** Mix table + cached folder video list — persisted in localStorage per user. */
export interface VideoMergeWorkspaceSettings {
  mix_rows: MixRowPayload[];
}

export interface VideoMergeSettings extends VideoMergeConfigSettings {
  mix_rows?: MixRowPayload[];
}

export interface SaveLoginSettingsPayload {
  remember_account: boolean;
  username: string;
  password: string;
}

/** Folder paths + thread count — persisted in SQLite (desktop) or localStorage (browser). */
export interface RemoveWatermarkSettings {
  input_folder: string;
  output_folder: string;
  thread_count: number;
}
