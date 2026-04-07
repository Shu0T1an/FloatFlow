import { useEffect } from "react";
import { listenForShortcutEvents } from "@/desktop/api";
import { useAppStore } from "@/store/app-store";
import { WindowShell } from "./WindowShell";

function App() {
  const hydrate = useAppStore((state) => state.hydrate);
  const theme = useAppStore((state) => state.preferences.theme);
  const activateQuickCapture = useAppStore((state) => state.activateQuickCapture);
  const isLoading = useAppStore((state) => state.isLoading);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let dispose: () => void = () => {};

    void listenForShortcutEvents((payload) => {
      if (payload.kind === "quick-capture") {
        activateQuickCapture();
      }
    }).then((cleanup) => {
      dispose = cleanup;
    });

    return () => {
      dispose();
    };
  }, [activateQuickCapture]);

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

  return <WindowShell />;
}

export default App;
