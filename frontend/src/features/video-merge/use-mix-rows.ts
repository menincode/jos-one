import { useCallback, useState } from "react";

import {
  createEmptyMixRow,
  type MixRow,
} from "@/features/video-merge/mix-row-types";

export function useMixRows(initialRows: MixRow[] = []) {
  const [rows, setRows] = useState<MixRow[]>(initialRows);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyMixRow()]);
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  }, []);

  const toggleLeadingVideo = useCallback((rowId: string, path: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) {
          return row;
        }
        const has = row.leadingPaths.includes(path);
        if (has) {
          return {
            ...row,
            leadingPaths: row.leadingPaths.filter((p) => p !== path),
          };
        }
        return { ...row, leadingPaths: [...row.leadingPaths, path] };
      }),
    );
  }, []);

  const setRowsFromPersisted = useCallback((next: MixRow[]) => {
    setRows(next);
  }, []);

  return {
    rows,
    addRow,
    removeRow,
    toggleLeadingVideo,
    setRowsFromPersisted,
  };
}
