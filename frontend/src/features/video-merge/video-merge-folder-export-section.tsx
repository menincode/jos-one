import { FolderPathField } from "@/features/video-merge/folder-path-field";
import { LogoPathField } from "@/features/video-merge/logo-path-field";
import { VideoMergeExportActions } from "@/features/video-merge/video-merge-export-actions";
import { VideoMergeExportSettingsPanel } from "@/features/video-merge/video-merge-export-settings";
import type { VideoMergeExportSettings } from "@/features/video-merge/video-merge-export-types";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import type { MergeFlowStatusDisplay } from "@/features/video-merge/merge-flow-status";

type VideoMergeFolderExportSectionProps = {
  inputFolder: string;
  outputFolder: string;
  onInputFolderChange: (value: string) => void;
  onOutputFolderChange: (value: string) => void;
  exportSettings: VideoMergeExportSettings;
  onExportSettingsChange: (
    patch: Partial<VideoMergeExportSettings>,
    options?: { immediate?: boolean },
  ) => void;
  settingsDisabled?: boolean;
  canOpenOutputFolder: boolean;
  canStartMerge: boolean;
  startHint?: string;
  flowStatus: MergeFlowStatusDisplay;
  isRunning: boolean;
  onStart: () => void | Promise<void>;
  onCancel: () => void | Promise<void>;
};

export function VideoMergeFolderExportSection({
  inputFolder,
  outputFolder,
  onInputFolderChange,
  onOutputFolderChange,
  exportSettings,
  onExportSettingsChange,
  settingsDisabled = false,
  canOpenOutputFolder,
  canStartMerge,
  startHint,
  flowStatus,
  isRunning,
  onStart,
  onCancel,
}: VideoMergeFolderExportSectionProps) {
  const { colors, radius } = APP_DARK_THEME;
  const formDisabled = isRunning || settingsDisabled;

  return (
    <section
      className="shrink-0 rounded-[var(--app-radius-card,1.125rem)] border"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: radius.card,
      }}
    >
      <div className="space-y-3 p-3">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <FolderPathField
            id="video-merge-input-folder"
            label="Thư mục đầu vào"
            value={inputFolder}
            onChange={onInputFolderChange}
            placeholder="VD: D:\Videos\clips"
            dialogKind="input"
            directoryHint={outputFolder}
            browseTone="blue"
            disabled={formDisabled}
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
            disabled={formDisabled}
          />
          <LogoPathField
            id="video-merge-logo-path"
            value={exportSettings.logoPath}
            onChange={(logoPath, options) =>
              onExportSettingsChange({ logoPath }, options)
            }
            disabled={formDisabled}
            directoryHint={inputFolder || outputFolder}
          />
        </div>

        <VideoMergeExportSettingsPanel
          settings={exportSettings}
          onChange={onExportSettingsChange}
          disabled={formDisabled}
          variant="grid"
        />

        <VideoMergeExportActions
          outputFolder={outputFolder}
          canOpenOutputFolder={canOpenOutputFolder}
          canStartMerge={canStartMerge}
          startHint={startHint}
          flowStatus={flowStatus}
          isRunning={isRunning}
          onStart={onStart}
          onCancel={onCancel}
          variant="row"
        />
      </div>
    </section>
  );
}
