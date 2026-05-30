import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearSavedCredentials,
  loadSavedCredentials,
  saveSavedCredentials,
} from "@/lib/auth/saved-credentials";
import { resetSettingsCacheForTests } from "@/lib/settings/app-settings-api";

const LOGIN_SETTINGS_STORAGE_KEY = "jos.settings.login";

describe("saved-credentials", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSettingsCacheForTests();
  });

  afterEach(() => {
    localStorage.clear();
    resetSettingsCacheForTests();
  });

  it("saves and loads username and password", async () => {
    await saveSavedCredentials("alice", "secret");
    await expect(loadSavedCredentials()).resolves.toEqual({
      username: "alice",
      password: "secret",
    });
  });

  it("trims username on save", async () => {
    await saveSavedCredentials("  bob  ", "pw");
    await expect(loadSavedCredentials()).resolves.toMatchObject({ username: "bob" });
  });

  it("rejects empty credentials", async () => {
    await expect(saveSavedCredentials("", "x")).rejects.toThrow(/Nhập tên đăng nhập/);
    await expect(saveSavedCredentials("u", "")).rejects.toThrow(/Nhập tên đăng nhập/);
  });

  it("clears stored credentials", async () => {
    await saveSavedCredentials("a", "b");
    await clearSavedCredentials();
    expect(localStorage.getItem(LOGIN_SETTINGS_STORAGE_KEY)).toBeNull();
    await expect(loadSavedCredentials()).resolves.toBeNull();
  });

  it("returns null for invalid JSON in legacy key", async () => {
    localStorage.setItem("jos.auth.saved-credentials", "not-json");
    await expect(loadSavedCredentials()).resolves.toBeNull();
  });
});
