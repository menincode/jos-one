import { Info } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

type MixStatusDetailButtonProps = {
  message: string;
  variant?: "info" | "warning" | "error";
  className?: string;
};

export function MixStatusDetailButton({
  message,
  variant = "warning",
  className,
}: MixStatusDetailButtonProps) {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  function showDetail() {
    if (variant === "error") {
      toast.error(trimmed, { duration: 12_000 });
      return;
    }
    toast.message(trimmed, { duration: 12_000 });
  }

  return (
    <button
      type="button"
      className={cn(
        "shrink-0 rounded p-0.5 hover:bg-white/10",
        variant === "error"
          ? "text-rose-300/90 hover:text-rose-200"
          : variant === "info"
            ? "text-cyan-300/90 hover:text-cyan-200"
            : "text-amber-300/90 hover:text-amber-200",
        className,
      )}
      title="Xem chi tiết"
      aria-label="Xem chi tiết trạng thái"
      onClick={showDetail}
    >
      <Info className="size-3.5" aria-hidden />
    </button>
  );
}
