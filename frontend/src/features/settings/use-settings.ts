import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createBridgeClient } from "@/lib/pywebview/api-client";
import type { BridgeAppSettings } from "@/lib/pywebview/types";

export function useSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<BridgeAppSettings>({
    enable_custom_bitrate: false,
    custom_video_bitrate: 5000,
    custom_audio_bitrate: 192,
  });

  useEffect(() => {
    async function load() {
      try {
        const bridge = await createBridgeClient();
        const data = await bridge.getAppSettings();
        setSettings(data);
      } catch (err) {
        console.error("Failed to load settings:", err);
        toast.error("Không thể tải cấu hình từ backend.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const saveSettings = async (newSettings: BridgeAppSettings) => {
    setSaving(true);
    try {
      const bridge = await createBridgeClient();
      const updated = await bridge.saveAppSettings(
        newSettings.enable_custom_bitrate,
        newSettings.custom_video_bitrate,
        newSettings.custom_audio_bitrate,
      );
      setSettings(updated);
      toast.success("Đã lưu cấu hình.");
    } catch (err) {
      console.error("Failed to save settings:", err);
      toast.error("Lưu cấu hình thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    setSettings,
    loading,
    saving,
    saveSettings,
  };
}
