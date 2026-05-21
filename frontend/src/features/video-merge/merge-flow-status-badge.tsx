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
  const { label, style } = display;

  return (
    <span
      className={cn(
        "inline-flex max-w-[min(100%,22rem)] items-center rounded-full border px-3 py-1 text-xs font-semibold leading-snug",
        style.pulse && "animate-pulse",
        align === "right" && "ml-auto shrink-0 text-right",
        className,
      )}
      style={{
        backgroundColor: style.bg,
        color: style.fg,
        borderColor: style.border,
      }}
      title={label}
    >
      {label}
    </span>
  );
}
