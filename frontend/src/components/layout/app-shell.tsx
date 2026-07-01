import { ChevronLeft, ChevronRight, Eraser, Film, Repeat } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { AppStatusBar } from "@/components/layout/app-status-bar";
import { SidebarLogoutButton } from "@/components/layout/sidebar-logout-button";
import { JOSVN_BRAND } from "@/features/auth/brand/josvn-brand";
import { isNavItemVisible } from "@/lib/auth/scopes";
import { cn } from "@/lib/utils";
import { AppToneIconBox } from "@/components/common/app-tone-icon-box";
import { APP_DARK_THEME, APP_NAV_ITEMS } from "@/theme/app-dark-theme";
import { useAuthStore } from "@/stores/auth-store";

const NAV_ICONS = {
  videoMerge: Film,
  watermark: Eraser,
  videoLoop: Repeat,
} as const;

const WORKSPACE_ROUTES = new Set(["/", "/watermark", "/loop", "/no-access"]);

export function AppShell() {
  const { colors, typography } = APP_DARK_THEME;
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);
  const visibleNavItems = APP_NAV_ITEMS.filter((item) => isNavItemVisible(item, user));
  const isWorkspace = WORKSPACE_ROUTES.has(pathname);

  return (
    <div
      className="dark app-theme flex h-dvh overflow-hidden"
      style={{
        fontFamily: typography.fontFamily,
        backgroundColor: colors.background,
        color: colors.foreground,
      }}
    >
      <div className="relative z-20 flex h-dvh shrink-0">
        <aside
          className={cn(
            "flex h-full flex-col overflow-hidden border-r transition-[width] duration-200 ease-in-out",
            collapsed ? "w-[4.5rem]" : "w-60",
          )}
          style={{
            backgroundColor: colors.navBar,
            borderColor: colors.border,
          }}
        >
          <div
            className="flex min-h-[4.25rem] items-center justify-center border-b px-4 py-4"
            style={{ borderColor: colors.border }}
          >
            {collapsed ? (
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg font-bold tracking-tight"
                style={{
                  backgroundColor: "rgba(168, 180, 255, 0.12)",
                  color: colors.navActive,
                }}
                aria-hidden
              >
                J
              </span>
            ) : (
              <img
                src={JOSVN_BRAND.logoSrc}
                alt={JOSVN_BRAND.logoAlt}
                className="mx-auto h-9 w-auto max-w-full object-contain"
                height={36}
              />
            )}
          </div>

          <nav
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3",
              collapsed && "items-center px-2",
            )}
          >
            {visibleNavItems.map((item) => {
              const Icon = NAV_ICONS[item.id];
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end={item.path === "/"}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-lg font-medium transition-colors",
                      collapsed
                        ? "justify-center p-2.5"
                        : "gap-3 px-3 py-2.5 text-sm",
                      isActive
                        ? "bg-[rgba(168,180,255,0.12)] text-[var(--app-nav-active)]"
                        : "text-[var(--app-muted)] hover:bg-white/5 hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <AppToneIconBox
                        icon={Icon}
                        tone={item.iconTone}
                        size="sm"
                        strokeWidth={isActive ? 2.25 : 2}
                      />
                      {!collapsed ? (
                        <span className="truncate">{item.label}</span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <SidebarLogoutButton collapsed={collapsed} />
        </aside>

        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          aria-expanded={!collapsed}
          className="absolute top-[2.125rem] right-0 z-30 flex size-7 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition-colors hover:brightness-110"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.foreground,
          }}
        >
          {collapsed ? (
            <ChevronRight className="size-4" strokeWidth={2.25} />
          ) : (
            <ChevronLeft className="size-4" strokeWidth={2.25} />
          )}
        </button>
      </div>

      <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className={cn(
              "mx-auto w-full",
              isWorkspace ? "max-w-none px-6" : "max-w-3xl",
            )}
          >
            <Outlet />
          </div>
        </div>
        <AppStatusBar />
      </main>
    </div>
  );
}
