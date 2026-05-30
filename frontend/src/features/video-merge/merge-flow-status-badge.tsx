import { MixStatusDetailButton } from "@/features/video-merge/mix-status-detail-button";
import type { MergeFlowStatusDisplay } from "@/features/video-merge/merge-flow-status";
import { cn } from "@/lib/utils";

type MergeFlowStatusBadgeProps = {
  display: MergeFlowStatusDisplay;
  className?: string;
  align?: "left" | "right";
};

export function MergeFlowStatusBadge({
  display,
  className,
  align = "right",
}: MergeFlowStatusBadgeProps) {
  const { label, style, detailMessage, showDetailInfo } = display;
  const detailVariant = display.key === "error" ? "error" : "warning";

  return (
    <div
      className={cn(
        "inline-flex max-w-[min(100%,11rem)] min-w-0 items-center gap-0.5",
        align === "right" && "ml-auto shrink-0",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex min-w-0 flex-1 truncate rounded-full border px-3 py-1 text-xs font-semibold leading-snug",
          style.pulse && "animate-pulse",
        )}
        style={{
          backgroundColor: style.bg,
          color: style.fg,
          borderColor: style.border,
        }}
      >
        {label}
      </span>
      {showDetailInfo && detailMessage ? (
        <MixStatusDetailButton
          message={detailMessage}
          variant={detailVariant === "error" ? "error" : "warning"}
        />
      ) : null}
    </div>
  );
}
