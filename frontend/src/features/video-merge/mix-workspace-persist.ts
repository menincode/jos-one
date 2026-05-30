import {
  mixRowsFromPayload,
  mixRowsToPayload,
  type MixRow,
} from "@/features/video-merge/mix-row-types";
import {
  getVideoMergeWorkspaceUserKey,
  loadVideoMergeWorkspace,
  persistMixRowsToWorkspace,
} from "@/lib/settings/video-merge-workspace-storage";

export function resolveMixWorkspaceUserKey(
  authUser: { id: number; username: string } | null,
): string {
  const fromStorage = getVideoMergeWorkspaceUserKey();
  if (fromStorage !== "default") {
    return fromStorage;
  }
  if (authUser?.id != null) {
    return String(authUser.id);
  }
  if (authUser?.username?.trim()) {
    return authUser.username.trim();
  }
  return "default";
}

export function resolveSelectedMixRowId(
  rows: MixRow[],
  storedId: string | null | undefined,
): string | null {
  if (!rows.length) {
    return null;
  }
  if (storedId && rows.some((row) => row.id === storedId)) {
    return storedId;
  }
  return rows[0]?.id ?? null;
}

export function loadMixWorkspaceState(userKey?: string): {
  rows: MixRow[];
  selectedMixRowId: string | null;
} {
  const workspace = loadVideoMergeWorkspace(userKey);
  const rows = mixRowsFromPayload(workspace.mix_rows);
  return {
    rows,
    selectedMixRowId: resolveSelectedMixRowId(rows, workspace.selected_mix_row_id),
  };
}

/** Synchronous localStorage write — call on every mix change. */
export function saveMixWorkspaceState(
  rows: MixRow[],
  selectedMixRowId: string | null,
  userKey?: string,
): void {
  persistMixRowsToWorkspace(mixRowsToPayload(rows), userKey, selectedMixRowId);
}
