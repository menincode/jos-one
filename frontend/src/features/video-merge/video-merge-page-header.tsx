import { Film } from "lucide-react";

import { MergeFlowStatusBadge } from "@/features/video-merge/merge-flow-status-badge";
import type { MergeFlowStatusDisplay } from "@/features/video-merge/merge-flow-status";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

type VideoMergePageHeaderProps = {
  flowStatus: MergeFlowStatusDisplay;
};

export function VideoMergePageHeader({ flowStatus }: VideoMergePageHeaderProps) {
  const { colors, typography, radius } = APP_DARK_THEME;

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 pb-1">
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${colors.headerGradientFrom}55, ${colors.headerGradientTo}44)`,
            borderRadius: radius.iconBox,
            color: colors.accent,
          }}
        >
          <Film className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <h1
          className="text-xl font-semibold tracking-tight"
          style={{ color: colors.foreground, fontFamily: typography.fontFamily }}
        >
          Ghép Video
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: colors.muted }}>
        <span>Trạng thái:</span>
        <MergeFlowStatusBadge display={flowStatus} />
      </div>
    </header>
  );
}
