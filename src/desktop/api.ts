import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import packageJson from "../../package.json";
import { createDefaultState, type AppState, type Hotkeys } from "@/shared/domain/app-state";
import { debugError, debugLog } from "@/shared/lib/debug-log";

export const SHORTCUT_EVENT_NAME = "floatflow://shortcut";
export const APP_STATE_UPDATED_EVENT_NAME = "floatflow://app-state-updated";
const WINDOW_KIND_QUERY_KEY = "window";
const WINDOW_KIND_BOOTSTRAP_KEY = "__FLOATFLOW_WINDOW_KIND__";

export type WindowKind = "main" | "settings";

export interface ShortcutEventPayload {
  kind: "quick-capture";
}

export interface DesktopAppInfo {
  version: string;
  dataDir: string;
}

export interface DesktopApi {
  loadAppState: () => Promise<AppState>;
  saveAppState: (state: AppState) => Promise<void>;
  exportAppState: (state: AppState) => Promise<void>;
  setAlwaysOnTop: (enabled: boolean) => Promise<void>;
  setWindowOpacity: (value: number) => Promise<void>;
  toggleMainWindow: () => Promise<void>;
  openSettingsWindow: () => Promise<void>;
  closeSettingsWindow: () => Promise<void>;
  registerGlobalShortcuts: (hotkeys: Hotkeys) => Promise<void>;
  getCurrentWindowKind: () => Promise<WindowKind>;
  getAppInfo: () => Promise<DesktopAppInfo>;
  listenForAppStateEvents: (onState: (state: AppState) => void) => Promise<() => void>;
}

const browserAppInfo: DesktopAppInfo = {
  version: packageJson.version,
  dataDir: "浏览器预览模式（不写入桌面应用目录）",
};

export const desktopApi: DesktopApi = {
  async loadAppState() {
    if (!isTauriEnvironment()) return createDefaultState();
    return invoke<AppState>("load_app_state");
  },
  async saveAppState(state) {
    if (!isTauriEnvironment()) return;
    await invoke("save_app_state", { state });
  },
  async exportAppState(state) {
    if (!isTauriEnvironment()) {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "floatflow-export.json";
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }

    const path = await save({
      defaultPath: "floatflow-export.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path) return;
    await invoke("export_app_state", { path, state });
  },
  async setAlwaysOnTop(enabled) {
    if (!isTauriEnvironment()) return;
    await invoke("set_always_on_top", { enabled });
  },
  async setWindowOpacity(value) {
    if (!isTauriEnvironment()) return;
    await invoke("set_window_opacity", { value });
  },
  async toggleMainWindow() {
    if (!isTauriEnvironment()) return;
    await invoke("toggle_main_window");
  },
  async openSettingsWindow() {
    if (!isTauriEnvironment()) {
      debugLog("desktop-api", "openSettingsWindow skipped outside tauri");
      return;
    }

    debugLog("desktop-api", "openSettingsWindow start");
    try {
      await invoke("open_settings_window");
      debugLog("desktop-api", "openSettingsWindow success");
    } catch (error) {
      debugError("desktop-api", "openSettingsWindow failed", error);
      throw error;
    }
  },
  async closeSettingsWindow() {
    if (!isTauriEnvironment()) {
      debugLog("desktop-api", "closeSettingsWindow skipped outside tauri");
      return;
    }

    debugLog("desktop-api", "closeSettingsWindow start");
    try {
      await invoke("close_settings_window");
      debugLog("desktop-api", "closeSettingsWindow success");
    } catch (error) {
      debugError("desktop-api", "closeSettingsWindow failed", error);
      throw error;
    }
  },
  async registerGlobalShortcuts(hotkeys) {
    if (!isTauriEnvironment()) return;
    await invoke("register_global_shortcuts", { hotkeys });
  },
  async getCurrentWindowKind() {
    const bootstrappedWindowKind = resolveBootstrappedWindowKind();
    if (bootstrappedWindowKind) {
      debugLog("desktop-api", "resolved window kind from bootstrap hint", {
        source: "bootstrap-hint",
        windowKind: bootstrappedWindowKind,
      });
      return bootstrappedWindowKind;
    }

    const hintedWindowKind = resolveWindowKindHint();
    if (hintedWindowKind) {
      debugLog("desktop-api", "resolved window kind from url hint", {
        source: "url-hint",
        windowKind: hintedWindowKind,
        search: window.location.search,
      });
      return hintedWindowKind;
    }

    if (!isTauriEnvironment()) {
      debugLog("desktop-api", "resolved window kind from browser fallback", {
        source: "browser-fallback",
        windowKind: "main",
      });
      return "main";
    }

    try {
      const label = await invoke<string>("get_current_window_label");
      const windowKind = label === "settings" ? "settings" : "main";
      debugLog("desktop-api", "resolved window kind from tauri label", {
        source: "tauri-label",
        label,
        windowKind,
      });
      return windowKind;
    } catch (error) {
      debugError("desktop-api", "getCurrentWindowKind failed", error);
      throw error;
    }
  },
  async getAppInfo() {
    if (!isTauriEnvironment()) return browserAppInfo;
    return invoke<DesktopAppInfo>("get_app_info");
  },
  async listenForAppStateEvents(onState) {
    if (!isTauriEnvironment()) {
      debugLog("desktop-api", "listenForAppStateEvents skipped outside tauri");
      return () => undefined;
    }

    debugLog("desktop-api", "listenForAppStateEvents subscribe");
    return listen<AppState>(APP_STATE_UPDATED_EVENT_NAME, (event) => {
      debugLog("desktop-api", "received app state sync event", {
        todos: event.payload.todos.length,
        memos: event.payload.memos.length,
        theme: event.payload.preferences.theme,
      });
      onState(event.payload);
    });
  },
};

export async function listenForShortcutEvents(
  onShortcut: (payload: ShortcutEventPayload) => void,
): Promise<() => void> {
  if (!isTauriEnvironment()) {
    return () => undefined;
  }

  return listen<ShortcutEventPayload>(SHORTCUT_EVENT_NAME, (event) => {
    onShortcut(event.payload);
  });
}

export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function resolveWindowKindHint(): WindowKind | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hintedWindowKind = new URLSearchParams(window.location.search).get(WINDOW_KIND_QUERY_KEY);
  if (hintedWindowKind === "settings" || hintedWindowKind === "main") {
    return hintedWindowKind;
  }

  return null;
}

function resolveBootstrappedWindowKind(): WindowKind | null {
  if (typeof window === "undefined") {
    return null;
  }

  const bootstrappedWindowKind = (
    window as Window & {
      [WINDOW_KIND_BOOTSTRAP_KEY]?: unknown;
    }
  )[WINDOW_KIND_BOOTSTRAP_KEY];

  if (bootstrappedWindowKind === "settings" || bootstrappedWindowKind === "main") {
    return bootstrappedWindowKind;
  }

  return null;
}
