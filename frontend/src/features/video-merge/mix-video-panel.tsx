import { MixVideoTable } from "@/features/video-merge/mix-video-table";
import type { MixRow } from "@/features/video-merge/mix-row-types";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import type { MixValidationContext } from "@/features/video-merge/mix-row-utils";
import type {
  VideoFileItem,
  VideoMergeJobOutput,
  VideoMergeRowJobState,
} from "@/lib/pywebview/types";

type MixVideoPanelProps = {
  isRunning: boolean;
  hasInputFolder: boolean;
  outputFolder: string;
  exportFormat: string;
  jobOutputs: VideoMergeJobOutput[];
  videos: VideoFileItem[];
  probingDurations: boolean;
  rows: MixRow[];
  rowJobStates: Record<string, VideoMergeRowJobState>;
  mixValidation: MixValidationContext;
  selectedRowId?: string | null;
  onSelectRow?: (rowId: string) => void;
  onRemoveRow: (rowId: string) => void;
};

export function MixVideoPanel({
  isRunning,
  hasInputFolder,
  outputFolder,
  exportFormat,
  jobOutputs,
  videos,
  probingDurations,
  rows,
  rowJobStates,
  mixValidation,
  selectedRowId,
  onSelectRow,
  onRemoveRow,
}: MixVideoPanelProps) {
  const { colors } = APP_DARK_THEME;

  if (!hasInputFolder) {
    return (
      <p
        className="px-6 py-16 text-center text-sm leading-relaxed"
        style={{ color: colors.muted }}
      >
        Chọn thư mục đầu vào để cấu hình bảng mix.
      </p>
    );
  }

  return (
    <MixVideoTable
      rows={rows}
      videos={videos}
      probingDurations={probingDurations}
      disabled={!hasInputFolder}
      jobActive={isRunning}
      outputFolder={outputFolder}
      exportFormat={exportFormat}
      jobOutputs={jobOutputs}
      rowJobStates={rowJobStates}
      mixValidation={mixValidation}
      selectedRowId={selectedRowId}
      onSelectRow={onSelectRow}
      onRemoveRow={onRemoveRow}
    />
  );
}
