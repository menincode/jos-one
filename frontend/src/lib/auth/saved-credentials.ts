/** Login "remember account" — persisted via SQLite (desktop) or localStorage (browser dev). */

import {
  fetchLoginSettings,
  persistLoginSettings,
  preloadAppSettings,
} from "@/lib/settings/app-settings-api";

/** @deprecated Legacy key; migrated once on login page load. */
export const SAVED_CREDENTIALS_STORAGE_KEY = "jos.auth.saved-credentials";

export interface SavedCredentials {
  username: string;
  password: string;
}

export async function loadSavedCredentials(): Promise<SavedCredentials | null> {
  await preloadAppSettings();
  const settings = await fetchLoginSettings();
  if (!settings.remember_account || !settings.username || !settings.password) {
    return null;
  }
  return { username: settings.username, password: settings.password };
}

export async function saveSavedCredentials(username: string, password: string): Promise<void> {
  const trimmed = username.trim();
  if (!trimmed || !password) {
    throw new Error("Nhập tên đăng nhập và mật khẩu trước khi lưu.");
  }
  await persistLoginSettings({
    remember_account: true,
    username: trimmed,
    password,
  });
}

export async function clearSavedCredentials(): Promise<void> {
  await persistLoginSettings({
    remember_account: false,
    username: "",
    password: "",
  });
}

export async function hasSavedCredentials(): Promise<boolean> {
  const saved = await loadSavedCredentials();
  return saved !== null;
}
