import { Settings, Save } from "lucide-react";
import { AppToneButton } from "@/components/common/app-tone-button";
import { AppPage } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { APP_DARK_THEME } from "@/theme/app-dark-theme";
import { useSettings } from "@/features/settings/use-settings";

export function SettingsPage() {
  const { colors, radius, typography } = APP_DARK_THEME;
  const { settings, setSettings, loading, saving, saveSettings } = useSettings();

  if (loading) {
    return (
      <AppPage className="flex min-h-[calc(100vh-12rem)] flex-col gap-4" title="Cài đặt hệ thống" icon={Settings}>
        <div className="flex flex-1 items-center justify-center text-sm" style={{ color: colors.muted }}>
          Đang tải cấu hình…
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage
      className="flex min-h-[calc(100vh-12rem)] flex-col gap-4"
      title="Cài đặt hệ thống"
      icon={Settings}
    >
      <section
        className="shrink-0 space-y-6 rounded-[var(--app-radius-card,1.125rem)] border p-6"
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.card,
        }}
      >
        <div className="flex flex-col gap-2 border-b pb-4" style={{ borderColor: colors.border }}>
          <h2 className="text-lg font-semibold text-white">Chất lượng Render</h2>
          <p className="text-sm" style={{ color: colors.muted }}>
            Cấu hình Bitrate mặc định khi Render video (Ghép, Xóa Logo, Loop).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="enable_custom_bitrate"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 bg-white/10 text-[var(--app-accent)] focus:ring-[var(--app-accent)]"
            checked={settings.enable_custom_bitrate}
            onChange={(e) => setSettings({ ...settings, enable_custom_bitrate: e.target.checked })}
          />
          <label
            htmlFor="enable_custom_bitrate"
            className="text-sm font-medium leading-none text-white peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Sử dụng cấu hình Bitrate tùy chỉnh
          </label>
        </div>

        {settings.enable_custom_bitrate && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="custom_video_bitrate"
                className="font-semibold uppercase tracking-wider"
                style={{ color: colors.muted, fontSize: typography.sectionLabel }}
              >
                Video Bitrate (kbps)
              </label>
              <Input
                id="custom_video_bitrate"
                type="number"
                min={100}
                max={50000}
                value={settings.custom_video_bitrate}
                onChange={(e) => setSettings({ ...settings, custom_video_bitrate: Number(e.target.value) })}
                className="w-full max-w-xs border-white/10 bg-white/5 text-sm text-white tabular-nums placeholder:text-white/35 focus-visible:ring-[var(--app-accent)]"
              />
              <p className="text-xs" style={{ color: colors.muted }}>
                Khuyến nghị: 5000 cho HD, 8000 cho Full HD.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="custom_audio_bitrate"
                className="font-semibold uppercase tracking-wider"
                style={{ color: colors.muted, fontSize: typography.sectionLabel }}
              >
                Audio Bitrate (kbps)
              </label>
              <Input
                id="custom_audio_bitrate"
                type="number"
                min={64}
                max={320}
                value={settings.custom_audio_bitrate}
                onChange={(e) => setSettings({ ...settings, custom_audio_bitrate: Number(e.target.value) })}
                className="w-full max-w-xs border-white/10 bg-white/5 text-sm text-white tabular-nums placeholder:text-white/35 focus-visible:ring-[var(--app-accent)]"
              />
              <p className="text-xs" style={{ color: colors.muted }}>
                Khuyến nghị: 192 cho chất lượng tốt.
              </p>
            </div>
          </div>
        )}

        <div className="pt-4">
          <AppToneButton
            icon={Save}
            tone="blue"
            size="default"
            disabled={saving}
            onClick={() => saveSettings(settings)}
          >
            {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </AppToneButton>
        </div>
      </section>
    </AppPage>
  );
}
