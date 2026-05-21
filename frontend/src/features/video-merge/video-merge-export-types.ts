export type VideoExportFormat = "mp4" | "mkv";

/** FFmpeg xfade name, or none / random for tail-clip transitions. */
export type SceneTransitionEffect =
  | "none"
  | "random"
  | "fade"
  | "fadeblack"
  | "fadewhite"
  | "dissolve"
  | "wipeleft"
  | "wiperight"
  | "wipeup"
  | "wipedown"
  | "slideleft"
  | "slideright"
  | "slideup"
  | "slidedown"
  | "circlecrop"
  | "distance"
  | "radial";

export type LogoPosition =
  | "top_left"
  | "top_center"
  | "top_right"
  | "middle_left"
  | "center"
  | "middle_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right";

export type VideoMergeExportSettings = {
  format: VideoExportFormat;
  resolution: string;
  fps: string;
  durationMinSec: string;
  durationMaxSec: string;
  zoomMin: string;
  zoomMax: string;
  speedMin: string;
  speedMax: string;
  concurrency: string;
  logoPath: string;
  logoPosition: LogoPosition;
  /** Transition between tail clips (after leading videos). */
  sceneTransition: SceneTransitionEffect;
  transitionDurationMinSec: string;
  transitionDurationMaxSec: string;
};

export const EXPORT_FORMAT_OPTIONS: { value: VideoExportFormat; label: string }[] = [
  { value: "mp4", label: "MP4" },
  { value: "mkv", label: "MKV" },
];

export type ExportResolutionOption = { value: string; label: string };

export type ExportResolutionGroup = {
  label: string;
  options: readonly ExportResolutionOption[];
};

const RATIO_LANDSCAPE = "16:9" as const;
const RATIO_VERTICAL = "9:16" as const;
const RATIO_SQUARE = "1:1" as const;

type ExportAspectRatio =
  | typeof RATIO_LANDSCAPE
  | typeof RATIO_VERTICAL
  | typeof RATIO_SQUARE;

const RESOLUTION_LABEL_SEP = " - ";

function resolutionLabel(
  size: string,
  ratio: ExportAspectRatio,
  tier?: string,
): string {
  return tier
    ? `${size}${RESOLUTION_LABEL_SEP}${ratio}${RESOLUTION_LABEL_SEP}${tier}`
    : `${size}${RESOLUTION_LABEL_SEP}${ratio}`;
}

/** Landscape, vertical, and square presets for Shorts, Reels, TikTok. */
export const EXPORT_RESOLUTION_GROUPS: readonly ExportResolutionGroup[] = [
  {
    label: `Ngang (${RATIO_LANDSCAPE})`,
    options: [
      {
        value: "3840x2160",
        label: resolutionLabel("3840×2160", RATIO_LANDSCAPE, "4K"),
      },
      {
        value: "2560x1440",
        label: resolutionLabel("2560×1440", RATIO_LANDSCAPE, "2K"),
      },
      {
        value: "1920x1080",
        label: resolutionLabel("1920×1080", RATIO_LANDSCAPE, "1080p"),
      },
      {
        value: "1280x720",
        label: resolutionLabel("1280×720", RATIO_LANDSCAPE, "720p"),
      },
      { value: "854x480", label: resolutionLabel("854×480", RATIO_LANDSCAPE) },
      { value: "640x360", label: resolutionLabel("640×360", RATIO_LANDSCAPE) },
    ],
  },
  {
    label: `Dọc — Shorts / Reels / TikTok (${RATIO_VERTICAL})`,
    options: [
      {
        value: "2160x3840",
        label: resolutionLabel("2160×3840", RATIO_VERTICAL, "4K"),
      },
      {
        value: "1440x2560",
        label: resolutionLabel("1440×2560", RATIO_VERTICAL, "2K"),
      },
      {
        value: "1080x1920",
        label: resolutionLabel("1080×1920", RATIO_VERTICAL, "1080p"),
      },
      {
        value: "720x1280",
        label: resolutionLabel("720×1280", RATIO_VERTICAL, "720p"),
      },
      { value: "540x960", label: resolutionLabel("540×960", RATIO_VERTICAL) },
    ],
  },
  {
    label: `Vuông — Shorts / Reels / TikTok (${RATIO_SQUARE})`,
    options: [
      {
        value: "2160x2160",
        label: resolutionLabel("2160×2160", RATIO_SQUARE, "4K"),
      },
      {
        value: "1440x1440",
        label: resolutionLabel("1440×1440", RATIO_SQUARE, "2K"),
      },
      {
        value: "1080x1080",
        label: resolutionLabel("1080×1080", RATIO_SQUARE, "1080p"),
      },
      {
        value: "720x720",
        label: resolutionLabel("720×720", RATIO_SQUARE, "720p"),
      },
      { value: "540x540", label: resolutionLabel("540×540", RATIO_SQUARE) },
      { value: "480x480", label: resolutionLabel("480×480", RATIO_SQUARE) },
    ],
  },
] as const;

export const EXPORT_RESOLUTION_OPTIONS: ExportResolutionOption[] =
  EXPORT_RESOLUTION_GROUPS.flatMap((group) => [...group.options]);

export const EXPORT_FPS_OPTIONS = [
  { value: "24", label: "24" },
  { value: "25", label: "25" },
  { value: "30", label: "30" },
  { value: "50", label: "50" },
  { value: "60", label: "60" },
] as const;

export const SCENE_TRANSITION_OPTIONS: { value: SceneTransitionEffect; label: string }[] = [
  { value: "none", label: "Không (cắt cứng)" },
  { value: "random", label: "Ngẫu nhiên" },
  { value: "fade", label: "Fade" },
  { value: "fadeblack", label: "Fade đen" },
  { value: "fadewhite", label: "Fade trắng" },
  { value: "dissolve", label: "Dissolve" },
  { value: "wipeleft", label: "Wipe trái" },
  { value: "wiperight", label: "Wipe phải" },
  { value: "wipeup", label: "Wipe lên" },
  { value: "wipedown", label: "Wipe xuống" },
  { value: "slideleft", label: "Slide trái" },
  { value: "slideright", label: "Slide phải" },
  { value: "slideup", label: "Slide lên" },
  { value: "slidedown", label: "Slide xuống" },
  { value: "circlecrop", label: "Circle crop" },
  { value: "distance", label: "Distance" },
  { value: "radial", label: "Radial" },
];

export const LOGO_POSITION_OPTIONS: { value: LogoPosition; label: string }[] = [
  { value: "top_left", label: "Trên — trái" },
  { value: "top_center", label: "Trên — giữa" },
  { value: "top_right", label: "Trên — phải" },
  { value: "middle_left", label: "Giữa — trái" },
  { value: "center", label: "Giữa màn hình" },
  { value: "middle_right", label: "Giữa — phải" },
  { value: "bottom_left", label: "Dưới — trái" },
  { value: "bottom_center", label: "Dưới — giữa" },
  { value: "bottom_right", label: "Dưới — phải" },
];

export const DEFAULT_EXPORT_SETTINGS: VideoMergeExportSettings = {
  format: "mp4",
  resolution: "1920x1080",
  fps: "30",
  durationMinSec: "60",
  durationMaxSec: "90",
  zoomMin: "1",
  zoomMax: "1.2",
  speedMin: "0.9",
  speedMax: "1.1",
  concurrency: "4",
  logoPath: "",
  logoPosition: "bottom_right",
  sceneTransition: "fade",
  transitionDurationMinSec: "0.4",
  transitionDurationMaxSec: "0.8",
};
