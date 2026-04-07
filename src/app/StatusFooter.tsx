import { useState } from "react";
import { useAppStore } from "@/store/app-store";

function getModeLabel(mode: "memo" | "todo") {
  return mode === "memo" ? "便笺" : "待办";
}

export function StatusFooter() {
  const exportState = useAppStore((state) => state.exportState);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const preferences = useAppStore((state) => state.preferences);
  const saveStatus = useAppStore((state) => state.saveStatus);
  const mode = useAppStore((state) => state.mode);
  const [open, setOpen] = useState(false);

  const syncLabel =
    saveStatus === "saving"
      ? "正在同步"
      : saveStatus === "pending"
        ? "等待保存"
        : saveStatus === "error"
          ? "同步失败"
          : "本地已同步";

  return (
    <footer className="relative mt-auto flex items-center justify-between gap-3 px-1 pt-3 text-[11px] ff-muted">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              saveStatus === "error" ? "bg-[var(--ff-gold)]" : "bg-[var(--ff-success)]"
            }`}
          />
          <span>{syncLabel}</span>
        </div>
        <div className="ff-pill-badge flex items-center gap-2 rounded-full px-3 py-1">
          <span>当前模式</span>
          <span className="font-semibold text-[var(--ff-title)]">{getModeLabel(mode)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button aria-label="数据导出" className="ff-footer-action" type="button" onClick={() => void exportState()}>
          数据导出
        </button>
        <button
          aria-label="系统设置"
          className="ff-footer-action"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          系统设置
        </button>
      </div>

      {open ? (
        <div className="ff-glass-strong absolute bottom-9 right-0 z-20 w-64 rounded-[18px] p-3">
          <p className="text-[11px] font-semibold tracking-[0.14em] ff-muted">设置</p>
          <button className="ff-settings-action mt-3" type="button" onClick={toggleTheme}>
            {preferences.theme === "light" ? "切换到深色" : "切换到浅色"}
          </button>

          <div className="mt-3 rounded-[14px] border border-[rgba(255,255,255,0.84)] bg-[rgba(255,255,255,0.36)] px-3 py-2">
            <p className="text-[11px] ff-muted">快捷键</p>
            <p className="mt-1 text-xs text-[var(--ff-title)]">{preferences.hotkeys.toggleMainWindow}</p>
            <p className="mt-1 text-xs text-[var(--ff-title)]">{preferences.hotkeys.quickCapture}</p>
          </div>

          <div className="mt-3 rounded-[14px] border border-[rgba(255,255,255,0.84)] bg-[rgba(255,255,255,0.36)] px-3 py-2">
            <p className="text-[11px] ff-muted">窗口行为</p>
            <p className="mt-1 text-xs text-[var(--ff-title)]">Pin 开启后会保持置顶显示</p>
            <p className="mt-1 text-xs text-[var(--ff-title)]">显示时自动回到右下角</p>
            <p className="mt-1 text-xs text-[var(--ff-title)]">100% 为实色，低于 100% 为玻璃态</p>
            <p className="mt-1 text-xs text-[var(--ff-title)]">当前版本位置固定，拖动将在后续版本支持</p>
          </div>

          <p className="mt-3 text-[11px] ff-muted">FloatFlow v0.1.0</p>
        </div>
      ) : null}
    </footer>
  );
}
