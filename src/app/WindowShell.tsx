import { MemoPanel } from "@/features/memo/MemoPanel";
import { TodoPanel } from "@/features/todo/TodoPanel";
import { ModeSwitch } from "@/features/window-controls/ModeSwitch";
import { useAppStore } from "@/store/app-store";
import { StatusFooter } from "./StatusFooter";
import { buildWidgetVisualState } from "./widget-visuals";

export function WindowShell() {
  const mode = useAppStore((state) => state.mode);
  const error = useAppStore((state) => state.error);
  const preferences = useAppStore((state) => state.preferences);
  const toggleAlwaysOnTop = useAppStore((state) => state.toggleAlwaysOnTop);
  const setWindowOpacity = useAppStore((state) => state.setWindowOpacity);
  const toggleMainWindow = useAppStore((state) => state.toggleMainWindow);
  const visual = buildWidgetVisualState(preferences.windowOpacity);

  return (
    <main className="min-h-screen p-0">
      <section
        data-testid="widget-shell"
        data-visual-mode={visual.mode}
        className="ff-widget-shell flex h-screen flex-col overflow-hidden rounded-[26px] px-4 pb-4 pt-3"
        style={visual.style}
      >
        <header className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3" data-tauri-drag-region>
              <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[linear-gradient(180deg,#8eb2ff,#5f88ea)] text-sm font-bold text-white shadow-[0_10px_20px_rgba(110,145,216,0.22)]">
                F
              </span>
              <div>
                <p className="text-base font-semibold text-[var(--ff-title)]">FloatFlow</p>
                <p className="text-[11px] tracking-[0.12em] ff-muted">桌边挂件</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="ff-pill-badge rounded-full px-3 py-1 text-[11px] font-medium text-[var(--ff-title)]">
                已吸附右下角
              </span>
              <div className="ff-toolbar-pill flex items-center gap-2 rounded-full px-1.5 py-1">
                <button
                  aria-label={preferences.alwaysOnTop ? "取消固定到桌面" : "固定到桌面"}
                  title={preferences.alwaysOnTop ? "取消固定到桌面" : "固定到桌面"}
                  className={`ff-icon-button ${preferences.alwaysOnTop ? "ff-icon-button-active" : ""}`}
                  type="button"
                  onClick={() => void toggleAlwaysOnTop()}
                >
                  <PinIcon />
                </button>
                <button
                  aria-label="隐藏窗口"
                  title="隐藏窗口"
                  className="ff-icon-button"
                  type="button"
                  onClick={() => void toggleMainWindow()}
                >
                  <MinimizeIcon />
                </button>
                <button
                  aria-label="关闭窗口"
                  title="关闭窗口"
                  className="ff-icon-button"
                  type="button"
                  onClick={() => void toggleMainWindow()}
                >
                  <CloseIcon />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-2 flex flex-col gap-4">
          <ModeSwitch />

          <section className="ff-surface-card rounded-[20px] px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold tracking-[0.14em] ff-muted">透明度</span>
              <input
                aria-label="挂件视觉透明度"
                className="w-full accent-[var(--ff-blue)]"
                max={1}
                min={0.1}
                step={0.05}
                type="range"
                value={preferences.windowOpacity}
                onChange={(event) => void setWindowOpacity(Number(event.currentTarget.value))}
              />
              <span className="text-[11px] font-semibold ff-muted">
                {Math.round(preferences.windowOpacity * 100)}%
              </span>
            </div>
            <p className="mt-2 text-[11px] ff-muted">100% 为实色，低于 100% 为玻璃态</p>
          </section>
        </div>

        {error ? (
          <div className="mt-4 rounded-[18px] border border-[rgba(220,190,155,0.46)] bg-[rgba(245,234,220,0.68)] px-4 py-3 text-sm text-[var(--ff-gold)]">
            {error}
          </div>
        ) : null}

        <div className="mt-4 flex-1 overflow-hidden">
          <div className="ff-scroll h-full overflow-y-auto pr-1">
            {mode === "memo" ? <MemoPanel /> : <TodoPanel />}
          </div>
        </div>

        <StatusFooter />
      </section>
    </main>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M9 4h6m-1 0v4l3 3v1H7v-1l3-3V4m2 8v8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M6 12h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
