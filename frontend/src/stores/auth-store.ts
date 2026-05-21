import { create } from "zustand";

import { authApiConfigError } from "@/lib/auth/config";
import { signInWithUsername } from "@/lib/auth/login-api";
import { invalidateVideoMergeSettingsCache } from "@/lib/settings/app-settings-api";
import { migrateDefaultWorkspaceToUser } from "@/lib/settings/video-merge-workspace-storage";
import { isPywebviewShell } from "@/lib/pywebview/readiness";
import type { AppUser } from "@/types/app-user";

const STORAGE_KEY = "jos.auth.user";

function loadStoredUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

function persistUser(user: AppUser | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    const user = loadStoredUser();
    if (user) {
      migrateDefaultWorkspaceToUser(String(user.id));
    }
    set({ user, isLoading: false });
  },

  signIn: async (username, password) => {
    if (!isPywebviewShell()) {
      const configErr = authApiConfigError();
      if (configErr) {
        set({ error: configErr, isLoading: false });
        throw new Error(configErr);
      }
    }

    set({ isLoading: true, error: null });
    try {
      const user = await signInWithUsername(username, password);
      persistUser(user);
      migrateDefaultWorkspaceToUser(String(user.id));
      invalidateVideoMergeSettingsCache();
      set({ user, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed.";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  signOut: async () => {
    persistUser(null);
    set({ user: null, isLoading: false, error: null });
  },
}));
