import { ExportDurationMinMax } from "@/features/video-merge/export-duration-min-max";
import {
  ExportField,
  ExportMinMax,
  ExportNumberInput,
  ExportSelect,
} from "@/features/video-merge/export-form-controls";
import type { VideoMergeExportSettings } from "@/features/video-merge/video-merge-export-types";
import {
  EXPORT_FORMAT_OPTIONS,
  EXPORT_FPS_OPTIONS,
  EXPORT_RESOLUTION_GROUPS,
  LOGO_POSITION_OPTIONS,
  SCENE_TRANSITION_OPTIONS,
} from "@/features/video-merge/video-merge-export-types";

type VideoMergeExportSettingsProps = {
  settings: VideoMergeExportSettings;
  onChange: (patch: Partial<VideoMergeExportSettings>) => void;
  disabled?: boolean;
  variant?: "stack" | "grid";
};

const compactSelect = { compact: true } as const;
const compactMinMax = { compact: true } as const;
const compactField = "shrink-0";

export function VideoMergeExportSettingsPanel({
  settings,
  onChange,
  disabled,
  variant = "stack",
}: VideoMergeExportSettingsProps) {
  const isGrid = variant === "grid";

  const formatField = (
    <ExportField
      label="Định dạng"
      className={isGrid ? `${compactField} w-[5.25rem]` : undefined}
    >
      <ExportSelect
        id="export-format"
        value={settings.format}
        onChange={(format) =>
          onChange({ format: format as VideoMergeExportSettings["format"] })
        }
        options={EXPORT_FORMAT_OPTIONS}
        disabled={disabled}
        {...(isGrid ? compactSelect : {})}
      />
    </ExportField>
  );

  const resolutionField = (
    <ExportField
      label={isGrid ? "Phân giải" : "Độ phân giải"}
      className={
        isGrid
          ? `${compactField} min-w-[12.5rem] w-[12.5rem]`
          : "min-w-[12.5rem] w-full max-w-sm"
      }
    >
      <ExportSelect
        id="export-resolution"
        value={settings.resolution}
        onChange={(resolution) => onChange({ resolution })}
        optionGroups={EXPORT_RESOLUTION_GROUPS}
        disabled={disabled}
        className="w-full min-w-0"
        {...(isGrid ? compactSelect : {})}
      />
    </ExportField>
  );

  const fpsField = (
    <ExportField
      label="FPS"
      className={isGrid ? `${compactField} w-[4.25rem]` : undefined}
    >
      <ExportSelect
        id="export-fps"
        value={settings.fps}
        onChange={(fps) => onChange({ fps })}
        options={EXPORT_FPS_OPTIONS}
        disabled={disabled}
        {...(isGrid ? compactSelect : {})}
      />
    </ExportField>
  );

  const logoPositionField = (
    <ExportField
      label="Vị trí logo"
      className={isGrid ? `${compactField} w-[6.5rem]` : undefined}
    >
      <ExportSelect
        id="export-logo-position"
        value={settings.logoPosition}
        onChange={(logoPosition) =>
          onChange({
            logoPosition: logoPosition as VideoMergeExportSettings["logoPosition"],
          })
        }
        options={LOGO_POSITION_OPTIONS}
        disabled={disabled}
        {...(isGrid ? compactSelect : {})}
      />
    </ExportField>
  );

  const durationField = (
    <ExportField
      label="Thời gian (phút)"
      className={isGrid ? `${compactField} w-[9.75rem]` : undefined}
    >
      <ExportDurationMinMax
        minId="export-duration-min"
        maxId="export-duration-max"
        minValueSec={settings.durationMinSec}
        maxValueSec={settings.durationMaxSec}
        onMinChange={(durationMinSec) => onChange({ durationMinSec })}
        onMaxChange={(durationMaxSec) => onChange({ durationMaxSec })}
        {...(isGrid ? compactMinMax : {})}
      />
    </ExportField>
  );

  const zoomField = (
    <ExportField
      label="Zoom"
      className={isGrid ? `${compactField} w-[8.25rem]` : undefined}
    >
      <ExportMinMax
        minId="export-zoom-min"
        maxId="export-zoom-max"
        minValue={settings.zoomMin}
        maxValue={settings.zoomMax}
        onMinChange={(zoomMin) => onChange({ zoomMin })}
        onMaxChange={(zoomMax) => onChange({ zoomMax })}
        minPlaceholder="1"
        maxPlaceholder="1.2"
        step="0.01"
        {...(isGrid ? compactMinMax : {})}
      />
    </ExportField>
  );

  const speedField = (
    <ExportField
      label="Speed"
      className={isGrid ? `${compactField} w-[8.25rem]` : undefined}
    >
      <ExportMinMax
        minId="export-speed-min"
        maxId="export-speed-max"
        minValue={settings.speedMin}
        maxValue={settings.speedMax}
        onMinChange={(speedMin) => onChange({ speedMin })}
        onMaxChange={(speedMax) => onChange({ speedMax })}
        minPlaceholder="0.9"
        maxPlaceholder="1.1"
        step="0.01"
        {...(isGrid ? compactMinMax : {})}
      />
    </ExportField>
  );

  const sceneTransitionField = (
    <ExportField
      label={isGrid ? "Chuyển cảnh" : "Hiệu ứng chuyển cảnh (video sau)"}
      className={isGrid ? `${compactField} min-w-[7.5rem] w-[7.5rem]` : undefined}
      title="Áp dụng giữa các video mix sau phần video đầu (không áp dụng giữa video đầu)"
    >
      <ExportSelect
        id="export-scene-transition"
        value={settings.sceneTransition}
        onChange={(sceneTransition) =>
          onChange({
            sceneTransition:
              sceneTransition as VideoMergeExportSettings["sceneTransition"],
          })
        }
        options={SCENE_TRANSITION_OPTIONS}
        disabled={disabled}
        className="w-full min-w-0"
        {...(isGrid ? compactSelect : {})}
      />
    </ExportField>
  );

  const concurrencyField = (
    <ExportField
      label={isGrid ? "Luồng" : "Luồng đồng thời"}
      className={isGrid ? `${compactField} w-[4.25rem]` : undefined}
      title="Số luồng ghép mix song song. Mỗi mix cũng render nhiều clip song song — tổng FFmpeg có thể ~ bình phương giá trị này. Giảm nếu máy lag."
    >
      <ExportNumberInput
        id="export-concurrency"
        value={settings.concurrency}
        onChange={(concurrency) => onChange({ concurrency })}
        disabled={disabled}
        min={1}
        max={32}
        placeholder="4"
        {...(isGrid ? compactSelect : {})}
      />
    </ExportField>
  );

  if (isGrid) {
    return (
      <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-3">
        {formatField}
        {resolutionField}
        {fpsField}
        {logoPositionField}
        {durationField}
        {zoomField}
        {speedField}
        {sceneTransitionField}
        {concurrencyField}
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-3">
      {formatField}
      {resolutionField}
      {fpsField}
      {logoPositionField}
      {durationField}
      {zoomField}
      {speedField}
      {sceneTransitionField}
      {concurrencyField}
    </div>
  );
}
