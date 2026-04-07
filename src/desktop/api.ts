import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { save } from "@tauri-apps/plugin-dialog";
import { createDefaultState, type AppState, type Hotkeys } from "@/shared/domain/app-state";

export const SHORTCUT_EVENT_NAME = "floatflow://shortcut";

export interface ShortcutEventPayload {
  kind: "quick-capture";
}

export interface DesktopApi {
  loadAppState: () => Promise<AppState>;
  saveAppState: (state: AppState) => Promise<void>;
  exportAppState: (state: AppState) => Promise<void>;
  setAlwaysOnTop: (enabled: boolean) => Promise<void>;
  setWindowOpacity: (value: number) => Promise<void>;
  toggleMainWindow: () => Promise<void>;
  registerGlobalShortcuts: (hotkeys: Hotkeys) => Promise<void>;
}

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
  async registerGlobalShortcuts(hotkeys) {
    if (!isTauriEnvironment()) return;
    await invoke("register_global_shortcuts", { hotkeys });
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
