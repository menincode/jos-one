import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { ExportDurationMinMax } from "@/features/video-merge/export-duration-min-max";
import { FolderPathField } from "@/features/video-merge/folder-path-field";
import { LogoPathField } from "@/features/video-merge/logo-path-field";
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
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { cn } from "@/lib/utils";

type VideoMergeConfigCardsProps = {
  inputFolder: string;
  outputFolder: string;
  onInputFolderChange: (value: string) => void;
  onOutputFolderChange: (value: string) => void;
  exportSettings: VideoMergeExportSettings;
  onExportSettingsChange: (
    patch: Partial<VideoMergeExportSettings>,
    options?: { immediate?: boolean },
  ) => void;
  disabled?: boolean;
};

function ConfigCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const { colors, radius, typography } = APP_DARK_THEME;

  return (
    <div
      className={cn("flex min-h-0 flex-col gap-3 p-3", className)}
      style={{
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.iconBox,
        border: `1px solid ${colors.border}`,
      }}
    >
      <h3
        className="font-semibold uppercase tracking-wider"
        style={{ color: colors.muted, fontSize: typography.sectionLabel }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export function VideoMergeConfigCards({
  inputFolder,
  outputFolder,
  onInputFolderChange,
  onOutputFolderChange,
  exportSettings,
  onExportSettingsChange,
  disabled,
}: VideoMergeConfigCardsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { colors } = APP_DARK_THEME;

  return (
    <div className="grid shrink-0 gap-2 lg:grid-cols-3">
      <ConfigCard title="Thư mục">
        <div className="space-y-2.5">
          <FolderPathField
            id="video-merge-input-folder"
            label="Thư mục đầu vào"
            value={inputFolder}
            onChange={onInputFolderChange}
            placeholder="VD: D:\Videos\clips"
            dialogKind="input"
            directoryHint={outputFolder}
            browseTone="blue"
            disabled={disabled}
          />
          <FolderPathField
            id="video-merge-output-folder"
            label="Thư mục đầu ra"
            value={outputFolder}
            onChange={onOutputFolderChange}
            placeholder="VD: D:\Videos\export"
            dialogKind="output"
            directoryHint={inputFolder}
            browseTone="purple"
            disabled={disabled}
          />
          <LogoPathField
            id="video-merge-logo-path"
            value={exportSettings.logoPath}
            onChange={(logoPath, options) =>
              onExportSettingsChange({ logoPath }, options)
            }
            disabled={disabled}
            directoryHint={inputFolder || outputFolder}
          />
        </div>
      </ConfigCard>

      <ConfigCard title="Xuất video">
        <div className="space-y-2.5">
          <ExportField label="Định dạng">
            <ExportSelect
              id="export-format"
              value={exportSettings.format}
              onChange={(format) =>
                onExportSettingsChange({
                  format: format as VideoMergeExportSettings["format"],
                })
              }
              options={EXPORT_FORMAT_OPTIONS}
              disabled={disabled}
              compact
            />
          </ExportField>
          <ExportField label="Phân giải">
            <ExportSelect
              id="export-resolution"
              value={exportSettings.resolution}
              onChange={(resolution) => onExportSettingsChange({ resolution })}
              optionGroups={EXPORT_RESOLUTION_GROUPS}
              disabled={disabled}
              className="w-full min-w-0"
              compact
            />
          </ExportField>
          <ExportField label="FPS">
            <ExportSelect
              id="export-fps"
              value={exportSettings.fps}
              onChange={(fps) => onExportSettingsChange({ fps })}
              options={EXPORT_FPS_OPTIONS}
              disabled={disabled}
              compact
            />
          </ExportField>
        </div>
      </ConfigCard>

      <ConfigCard title="Biến thể">
        <div className="space-y-2">
          <ExportField label="Thời gian (phút)" layout="row">
            <ExportDurationMinMax
              minId="export-duration-min"
              maxId="export-duration-max"
              minValueSec={exportSettings.durationMinSec}
              maxValueSec={exportSettings.durationMaxSec}
              onMinChange={(durationMinSec) => onExportSettingsChange({ durationMinSec })}
              onMaxChange={(durationMaxSec) => onExportSettingsChange({ durationMaxSec })}
              compact
              inline
              disabled={disabled}
            />
          </ExportField>
          <ExportField label="Zoom" layout="row">
            <ExportMinMax
              minId="export-zoom-min"
              maxId="export-zoom-max"
              minValue={exportSettings.zoomMin}
              maxValue={exportSettings.zoomMax}
              onMinChange={(zoomMin) => onExportSettingsChange({ zoomMin })}
              onMaxChange={(zoomMax) => onExportSettingsChange({ zoomMax })}
              minPlaceholder="1"
              maxPlaceholder="1.2"
              step="0.01"
              compact
              inline
              disabled={disabled}
            />
          </ExportField>
          <ExportField label="Speed" layout="row">
            <ExportMinMax
              minId="export-speed-min"
              maxId="export-speed-max"
              minValue={exportSettings.speedMin}
              maxValue={exportSettings.speedMax}
              onMinChange={(speedMin) => onExportSettingsChange({ speedMin })}
              onMaxChange={(speedMax) => onExportSettingsChange({ speedMax })}
              minPlaceholder="0.9"
              maxPlaceholder="1.1"
              step="0.01"
              compact
              inline
              disabled={disabled}
            />
          </ExportField>
        </div>

        <ExportField
          label="Luồng đồng thời"
          layout="row"
          title="Số luồng ghép mix song song. Mỗi mix cũng render nhiều clip song song — tổng FFmpeg có thể ~ bình phương giá trị này. Giảm nếu máy lag."
        >
          <ExportNumberInput
            id="export-concurrency"
            value={exportSettings.concurrency}
            onChange={(concurrency) => onExportSettingsChange({ concurrency })}
            disabled={disabled}
            min={1}
            max={32}
            placeholder="4"
            compact
          />
        </ExportField>

        <button
          type="button"
          className="mt-1 flex items-center gap-1 text-xs hover:text-white/80"
          style={{ color: colors.muted }}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          {advancedOpen ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
          Cài đặt nâng cao
        </button>

        {advancedOpen ? (
          <div className="grid gap-2 border-t pt-2" style={{ borderColor: colors.border }}>
            <ExportField label="Vị trí logo">
              <ExportSelect
                id="export-logo-position"
                value={exportSettings.logoPosition}
                onChange={(logoPosition) =>
                  onExportSettingsChange({
                    logoPosition: logoPosition as VideoMergeExportSettings["logoPosition"],
                  })
                }
                options={LOGO_POSITION_OPTIONS}
                disabled={disabled}
                compact
              />
            </ExportField>
            <ExportField label="Chuyển cảnh">
              <ExportSelect
                id="export-scene-transition"
                value={exportSettings.sceneTransition}
                onChange={(sceneTransition) =>
                  onExportSettingsChange({
                    sceneTransition:
                      sceneTransition as VideoMergeExportSettings["sceneTransition"],
                  })
                }
                options={SCENE_TRANSITION_OPTIONS}
                disabled={disabled}
                compact
              />
            </ExportField>
          </div>
        ) : null}
      </ConfigCard>
    </div>
  );
}
