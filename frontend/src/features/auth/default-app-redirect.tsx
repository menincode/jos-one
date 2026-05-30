import { Navigate } from "react-router-dom";

import { getDefaultAppPath } from "@/lib/auth/scopes";
import { useAuthStore } from "@/stores/auth-store";

export function DefaultAppRedirect() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={getDefaultAppPath(user)} replace />;
}
