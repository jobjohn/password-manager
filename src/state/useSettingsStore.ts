import { create } from "zustand";
import * as commands from "../lib/tauriCommands";
import type { Settings, Theme } from "../types/settings";

const defaultSettings: Settings = { theme: "system", alwaysOnTop: false };

let systemThemeQuery: MediaQueryList | null = null;
let systemThemeListenerAttached = false;

function applyThemeClass(theme: Theme) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

interface SettingsState {
  settings: Settings;
  isLoaded: boolean;
  init: () => Promise<void>;
  update: (next: Settings) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoaded: false,

  init: async () => {
    const settings = await commands.getSettings();
    set({ settings, isLoaded: true });
    applyThemeClass(settings.theme);

    if (!systemThemeListenerAttached) {
      systemThemeListenerAttached = true;
      systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
      systemThemeQuery.addEventListener("change", () => {
        if (get().settings.theme === "system") {
          applyThemeClass("system");
        }
      });
    }
  },

  update: async (next: Settings) => {
    set({ settings: next });
    applyThemeClass(next.theme);
    await commands.updateSettings(next);
  },
}));
