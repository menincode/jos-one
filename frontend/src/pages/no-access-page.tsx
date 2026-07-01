import { ShieldAlert } from "lucide-react";

import { AppPage, WorkspacePanel } from "@/components/layout";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";

export function NoAccessPage() {
  const { colors } = APP_DARK_THEME;

  return (
    <AppPage
      className="flex min-h-[calc(100vh-12rem)] flex-col"
      title="Chưa có quyền truy cập"
      icon={ShieldAlert}
    >
      <WorkspacePanel className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <p className="max-w-md text-sm leading-relaxed" style={{ color: colors.muted }}>
            Vui lòng liên hệ quản trị viên để được cấp quyền truy cập.
          </p>
        </div>
      </WorkspacePanel>
    </AppPage>
  );
}
