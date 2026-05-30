import { Navigate, Outlet } from "react-router-dom";

import { getDefaultAppPath, hasScope, type AppScope } from "@/lib/auth/scopes";
import { useAuthStore } from "@/stores/auth-store";

interface ScopeProtectedRouteProps {
  scope: AppScope;
}

export function ScopeProtectedRoute({ scope }: ScopeProtectedRouteProps) {
  const user = useAuthStore((state) => state.user);

  if (!hasScope(user, scope)) {
    return <Navigate to={getDefaultAppPath(user)} replace />;
  }

  return <Outlet />;
}
