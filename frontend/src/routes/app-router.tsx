import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "@/features/auth/login-page";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { ScopeProtectedRoute } from "@/features/auth/scope-protected-route";
import { DefaultAppRedirect } from "@/features/auth/default-app-redirect";
import { AppShell } from "@/components/layout/app-shell";
import { APP_SCOPES } from "@/lib/auth/scopes";
import { NoAccessPage } from "@/pages/no-access-page";
import { RemoveWatermarkPage } from "@/pages/remove-watermark-page";
import { VideoLoopPage } from "@/pages/video-loop-page";
import { VideoMergePage } from "@/pages/video-merge-page";
import { SettingsPage } from "@/pages/settings-page";

export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route element={<ScopeProtectedRoute scope={APP_SCOPES.VIDEO_EDITOR_WRITE} />}>
              <Route path="/" element={<VideoMergePage />} />
            </Route>
            <Route path="/no-access" element={<NoAccessPage />} />
            <Route path="/prompt" element={<DefaultAppRedirect />} />
            <Route element={<ScopeProtectedRoute scope={APP_SCOPES.REMOVE_WATERMARK_WRITE} />}>
              <Route path="/watermark" element={<RemoveWatermarkPage />} />
            </Route>
            <Route element={<ScopeProtectedRoute scope={APP_SCOPES.VIDEO_LOOP_WRITE} />}>
              <Route path="/loop" element={<VideoLoopPage />} />
            </Route>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/overview" element={<Navigate to="/" replace />} />
            <Route path="/messages" element={<Navigate to="/" replace />} />
            <Route path="/orders" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<DefaultAppRedirect />} />
      </Routes>
    </HashRouter>
  );
}
