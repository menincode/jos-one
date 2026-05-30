import type { MixRow } from "@/features/video-merge/mix-row-types";
import type { VideoMergeRowJobState } from "@/lib/pywebview/types";

/** Chaptime from persisted row or live job state (during/after merge session). */
export function resolveChaptimeForRow(
  row: MixRow,
  rowJobStates?: Record<string, VideoMergeRowJobState>,
): string | undefined {
  const live = rowJobStates?.[row.id]?.chaptime?.trim();
  if (live) {
    return live;
  }
  const stored = row.chaptime?.trim();
  return stored || undefined;
}

export function canCopyChaptimeForRow(
  row: MixRow,
  rowJobStates?: Record<string, VideoMergeRowJobState>,
): boolean {
  return resolveChaptimeForRow(row, rowJobStates) != null;
}

export async function copyChaptimeToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) {
    return false;
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to legacy */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
