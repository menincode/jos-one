import { Navigate, Outlet } from "react-router-dom";

import { JOSVN_LOGIN_GRADIENT } from "@/features/auth/brand/josvn-brand";
import { useAuthStore } from "@/stores/auth-store";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { colors, typography } = APP_DARK_THEME;

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          backgroundColor: colors.background,
          color: colors.muted,
          fontFamily: typography.fontFamily,
        }}
      >
        Đang tải…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen" style={{ background: JOSVN_LOGIN_GRADIENT }}>
        <Navigate to="/login" replace />
      </div>
    );
  }

  return <Outlet />;
}
