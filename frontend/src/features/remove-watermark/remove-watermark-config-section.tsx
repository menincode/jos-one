import { FolderPathField } from "@/features/video-merge/folder-path-field";
import {
  ExportField,
  ExportNumberInput,
} from "@/features/video-merge/export-form-controls";

type RemoveWatermarkConfigSectionProps = {
  inputFolder: string;
  outputFolder: string;
  threadCount: number;
  onInputFolderChange: (
    value: string,
    options?: { immediate?: boolean },
  ) => void;
  onOutputFolderChange: (value: string) => void;
  onThreadCountChange: (value: number) => void;
  disabled?: boolean;
};

export function RemoveWatermarkConfigSection({
  inputFolder,
  outputFolder,
  threadCount,
  onInputFolderChange,
  onOutputFolderChange,
  onThreadCountChange,
  disabled = false,
}: RemoveWatermarkConfigSectionProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_minmax(7rem,9rem)] lg:items-end">
      <FolderPathField
        id="watermark-input-folder"
        label="Thư mục video đầu vào"
        value={inputFolder}
        onChange={onInputFolderChange}
        dialogKind="input"
        directoryHint={outputFolder}
        browseTone="purple"
        disabled={disabled}
      />
      <FolderPathField
        id="watermark-output-folder"
        label="Thư mục đầu ra"
        value={outputFolder}
        onChange={onOutputFolderChange}
        dialogKind="output"
        directoryHint={inputFolder}
        browseTone="teal"
        disabled={disabled}
      />
      <ExportField
        label="Luồng đồng thời"
        title="Số video xử lý song song. Giảm nếu máy lag hoặc thiếu RAM."
      >
        <ExportNumberInput
          id="watermark-thread-count"
          value={String(threadCount)}
          onChange={(value) =>
            onThreadCountChange(Math.max(1, Math.min(32, Number(value) || 1)))
          }
          disabled={disabled}
          min={1}
          max={32}
          placeholder="4"
          compact
        />
      </ExportField>
    </div>
  );
}
