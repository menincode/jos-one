import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AppToneIconBox } from "@/components/common/app-tone-icon-box";
import { cn } from "@/lib/utils";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { useAuthStore } from "@/stores/auth-store";

type SidebarLogoutButtonProps = {
  collapsed: boolean;
};

export function SidebarLogoutButton({ collapsed }: SidebarLogoutButtonProps) {
  const navigate = useNavigate();
  const signOut = useAuthStore((s) => s.signOut);
  const { colors } = APP_DARK_THEME;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
      toast.success("Đã đăng xuất");
    } catch {
      toast.error("Đăng xuất thất bại");
    }
  };

  return (
    <div
      className="shrink-0 border-t p-3"
      style={{ borderColor: colors.border }}
    >
      <button
        type="button"
        onClick={() => void handleSignOut()}
        title={collapsed ? "Đăng xuất" : undefined}
        className={cn(
          "flex w-full items-center rounded-lg font-medium transition-colors",
          collapsed
            ? "justify-center p-2.5 text-[var(--app-muted)] hover:bg-white/5 hover:text-foreground"
            : "gap-3 px-3 py-2.5 text-sm text-[var(--app-muted)] hover:bg-white/5 hover:text-rose-300",
        )}
      >
        <AppToneIconBox icon={LogOut} tone="rose" size="sm" strokeWidth={1.75} />
        {!collapsed ? <span className="truncate">Đăng xuất</span> : null}
      </button>
    </div>
  );
}
