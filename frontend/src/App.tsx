import { useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";
import { preloadAppSettings } from "@/lib/settings/app-settings-api";
import { createBridgeClient } from "@/lib/pywebview/api-client";
import { AppRouter } from "@/routes/app-router";
import { useAuthStore } from "@/stores/auth-store";

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    void Promise.all([createBridgeClient().catch(() => undefined), preloadAppSettings()]).catch(
      () => {
        /* preload retries when Ghép Video / login mount after bridge is ready */
      },
    );
  }, []);

  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}
