export function getRemoveWatermarkFolderHint(
  inputFolder: string,
  outputFolder: string,
): string | undefined {
  if (!inputFolder.trim()) {
    return "Chọn thư mục đầu vào";
  }
  if (!outputFolder.trim()) {
    return "Chọn thư mục đầu ra";
  }
  return undefined;
}

export function getRemoveWatermarkLoadHint(
  inputFolder: string,
  outputFolder: string,
  loadingRows: boolean,
  busy: boolean,
): string | undefined {
  if (busy) {
    return "Đang xử lý video.";
  }
  if (loadingRows) {
    return "Đang tải danh sách…";
  }
  return getRemoveWatermarkFolderHint(inputFolder, outputFolder);
}

export function getRemoveWatermarkStartHint(params: {
  settingsLoading: boolean;
  inputFolder: string;
  outputFolder: string;
  eligibleCount: number;
  busy: boolean;
}): string | undefined {
  if (params.settingsLoading) {
    return "Đang tải cài đặt…";
  }
  if (params.busy) {
    return undefined;
  }
  const folderHint = getRemoveWatermarkFolderHint(
    params.inputFolder,
    params.outputFolder,
  );
  if (folderHint) {
    return folderHint;
  }
  if (params.eligibleCount === 0) {
    return "Tải danh sách video trước khi xóa watermark.";
  }
  return undefined;
}
