import { useEffect } from "react";
import { listenForShortcutEvents, desktopApi } from "@/desktop/api";
import { useAppStore } from "@/store/app-store";
import { SettingsWindowShell } from "@/features/settings/SettingsWindowShell";
import { debugLog } from "@/shared/lib/debug-log";
import { WindowShell } from "./WindowShell";

function App() {
  const hydrate = useAppStore((state) => state.hydrate);
  const replacePersistedState = useAppStore((state) => state.replacePersistedState);
  const theme = useAppStore((state) => state.preferences.theme);
  const activateQuickCapture = useAppStore((state) => state.activateQuickCapture);
  const isLoading = useAppStore((state) => state.isLoading);
  const windowKind = useAppStore((state) => state.windowKind);

  useEffect(() => {
    debugLog("app", "mount");
    void hydrate();

    return () => {
      debugLog("app", "unmount");
    };
  }, [hydrate]);

  useEffect(() => {
    document.body.dataset.theme = theme;
    document.documentElement.dataset.windowKind = windowKind;
    debugLog("app", "document dataset updated", { theme, windowKind });
  }, [theme, windowKind]);

  useEffect(() => {
    let disposeStateSync: () => void = () => {};
    debugLog("app", "subscribe app state sync");
    void desktopApi.listenForAppStateEvents((state) => {
      debugLog("app", "apply synced state", {
        todos: state.todos.length,
        memos: state.memos.length,
        theme: state.preferences.theme,
      });
      replacePersistedState(state);
    }).then((cleanup) => {
      disposeStateSync = cleanup;
    });

    return () => {
      debugLog("app", "dispose app state sync");
      disposeStateSync();
    };
  }, [replacePersistedState]);

  useEffect(() => {
    if (windowKind !== "main") {
      return () => undefined;
    }

    let dispose: () => void = () => {};

    void listenForShortcutEvents((payload) => {
      debugLog("app", "received shortcut event", payload);
      if (payload.kind === "quick-capture") {
        activateQuickCapture();
      }
    }).then((cleanup) => {
      dispose = cleanup;
    });

    return () => {
      debugLog("app", "dispose shortcut listener");
      dispose();
    };
  }, [activateQuickCapture, windowKind]);

  useEffect(() => {
    debugLog("app", "render branch changed", { isLoading, windowKind });
  }, [isLoading, windowKind]);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="ff-glass-strong max-w-md rounded-[28px] p-6 text-center">
          <h1 className="text-2xl font-semibold">FloatFlow</h1>
          <p className="mt-3 text-sm leading-7 ff-muted">正在恢复你的桌边挂件状态...</p>
        </div>
      </main>
    );
  }

  return windowKind === "settings" ? <SettingsWindowShell /> : <WindowShell />;
}

export default App;
