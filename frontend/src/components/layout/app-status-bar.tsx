import { User } from "lucide-react";
import { useEffect, useState } from "react";

import { JOSVN_BRAND } from "@/features/auth/brand/josvn-brand";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { useAuthStore } from "@/stores/auth-store";

export const APP_STATUS_BAR_HEIGHT = "2.25rem";

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function formatNow(): string {
  return timeFormatter.format(new Date());
}

export function AppStatusBar() {
  const user = useAuthStore((s) => s.user);
  const { colors } = APP_DARK_THEME;
  const [now, setNow] = useState(formatNow);

  useEffect(() => {
    const tick = () => setNow(formatNow());
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <footer
      className="flex shrink-0 items-center justify-between gap-4 border-t px-4 text-xs"
      style={{
        height: APP_STATUS_BAR_HEIGHT,
        backgroundColor: colors.navBar,
        borderColor: colors.border,
        color: colors.muted,
      }}
    >
      <span
        className="flex min-w-0 items-center gap-1.5 truncate"
        style={{ color: colors.foreground }}
      >
        <User
          className="size-3.5 shrink-0 text-[var(--app-muted)]"
          strokeWidth={2}
          aria-hidden
        />
        <span className="truncate">
          {user?.username ?? "—"}
          {user?.role ? (
            <span className="text-[var(--app-muted)]"> · {user.role}</span>
          ) : null}
        </span>
      </span>

      <time
        dateTime={new Date().toISOString()}
        className="min-w-0 truncate tabular-nums"
        title="Thời gian hiện tại"
      >
        {now}
      </time>

      <span className="shrink-0 font-medium" style={{ color: colors.foreground }}>
        {JOSVN_BRAND.appName}{" "}
        <span className="text-[var(--app-muted)] font-normal">
          v{JOSVN_BRAND.appVersion}
        </span>
      </span>
    </footer>
  );
}
