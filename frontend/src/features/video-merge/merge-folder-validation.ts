export type MergeFolderValidationState = {
  checking: boolean;
  inputFilled: boolean;
  outputFilled: boolean;
  inputExists: boolean;
  outputExists: boolean;
};

export const EMPTY_MERGE_FOLDER_VALIDATION: MergeFolderValidationState = {
  checking: false,
  inputFilled: false,
  outputFilled: false,
  inputExists: false,
  outputExists: false,
};

export function mergeFoldersFilled(inputFolder: string, outputFolder: string): boolean {
  return Boolean(inputFolder.trim() && outputFolder.trim());
}

export function mergeFoldersReady(state: MergeFolderValidationState): boolean {
  return (
    state.inputFilled &&
    state.outputFilled &&
    state.inputExists &&
    state.outputExists &&
    !state.checking
  );
}

/** Show mix table when input path is set and videos were listed or input dir validated. */
export function canShowMixVideoTable(
  inputFolder: string,
  videosCount: number,
  state: MergeFolderValidationState,
): boolean {
  if (!inputFolder.trim()) {
    return false;
  }
  if (videosCount > 0) {
    return true;
  }
  return !state.checking && state.inputExists;
}

export function getMergeFolderBlockingHint(
  state: MergeFolderValidationState,
): string | undefined {
  if (state.checking) {
    return "Đang kiểm tra thư mục…";
  }
  if (!state.inputFilled) {
    return "Chọn thư mục đầu vào";
  }
  if (!state.outputFilled) {
    return "Chọn thư mục đầu ra";
  }
  if (!state.inputExists) {
    return "Thư mục đầu vào không tồn tại";
  }
  if (!state.outputExists) {
    return "Thư mục đầu ra không tồn tại";
  }
  return undefined;
}
