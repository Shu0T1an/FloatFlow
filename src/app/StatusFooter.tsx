import { useAppStore } from "@/store/app-store";

function getModeLabel(mode: "memo" | "todo") {
  return mode === "memo" ? "便笺" : "待办";
}

export function StatusFooter() {
  const openSettingsWindow = useAppStore((state) => state.openSettingsWindow);
  const saveStatus = useAppStore((state) => state.saveStatus);
  const mode = useAppStore((state) => state.mode);

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
        <button
          aria-label="系统设置"
          className="ff-footer-action"
          type="button"
          onClick={() => void openSettingsWindow()}
        >
          系统设置
        </button>
      </div>
    </footer>
  );
}
