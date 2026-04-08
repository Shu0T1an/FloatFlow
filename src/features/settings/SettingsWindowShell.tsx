import { useEffect, useState, type ReactNode } from "react";
import { useAppStore } from "@/store/app-store";
import { debugError, debugLog } from "@/shared/lib/debug-log";

type SettingsSection = "general" | "hotkeys" | "data" | "about";
type GeneralTab = "basic" | "window" | "appearance";

const sections: Array<{ id: SettingsSection; label: string; icon: string }> = [
  { id: "general", label: "通用", icon: "⚙" },
  { id: "hotkeys", label: "快捷键", icon: "⌨" },
  { id: "data", label: "数据管理", icon: "🗂" },
  { id: "about", label: "关于", icon: "ⓘ" },
];

const generalTabs: Array<{ id: GeneralTab; label: string }> = [
  { id: "basic", label: "基础" },
  { id: "window", label: "窗口交互" },
  { id: "appearance", label: "外观" },
];

export function SettingsWindowShell() {
  const [section, setSection] = useState<SettingsSection>("general");
  const [generalTab, setGeneralTab] = useState<GeneralTab>("basic");
  const closeSettingsWindow = useAppStore((state) => state.closeSettingsWindow);

  useEffect(() => {
    debugLog("settings-window", "mount");

    return () => {
      debugLog("settings-window", "unmount");
    };
  }, []);

  useEffect(() => {
    debugLog("settings-window", "navigation changed", { section, generalTab });
  }, [generalTab, section]);

  const handleClose = () => {
    debugLog("settings-window", "close button clicked", { section, generalTab });
    void closeSettingsWindow().catch((error) => {
      debugError("settings-window", "closeSettingsWindow failed", error);
    });
  };

  return (
    <main className="ff-settings-window min-h-screen">
      <div className="ff-settings-frame flex min-h-screen text-[var(--ff-settings-text)]">
        <aside className="ff-settings-sidebar flex w-[196px] shrink-0 flex-col border-r border-[var(--ff-settings-line)] px-4 py-5">
          <div>
            <p className="ff-settings-kicker text-[11px] font-semibold uppercase tracking-[0.22em]">
              FloatFlow
            </p>
            <h1 className="mt-2 text-[15px] font-semibold text-[var(--ff-settings-strong)]">系统设置</h1>
          </div>

          <nav aria-label="设置分类" className="mt-6 grid gap-1.5">
            {sections.map((item) => {
              const active = item.id === section;
              return (
                <button
                  key={item.id}
                  aria-label={item.label}
                  className={`ff-settings-nav-item ${active ? "ff-settings-nav-item-active" : ""}`}
                  type="button"
                  onClick={() => setSection(item.id)}
                >
                  <span aria-hidden className="text-[15px] leading-none">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            aria-label="返回主挂件"
            className="ff-settings-ghost mt-auto"
            type="button"
            onClick={handleClose}
          >
            返回主挂件
          </button>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-[var(--ff-settings-main)] px-10 py-8">
          <header className="border-b border-[var(--ff-settings-line)] pb-4">
            <h2 className="text-[34px] font-semibold tracking-[-0.03em] text-[var(--ff-settings-strong)]">
              {sectionTitle(section)}
            </h2>
            {section === "general" ? (
              <div className="mt-6 flex items-center gap-6" role="tablist" aria-label="通用设置分类">
                {generalTabs.map((tab) => {
                  const active = tab.id === generalTab;
                  return (
                    <button
                      key={tab.id}
                      aria-selected={active}
                      className={`ff-settings-tab ${active ? "ff-settings-tab-active" : ""}`}
                      role="tab"
                      type="button"
                      onClick={() => setGeneralTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </header>

          <div className="ff-scroll min-h-0 flex-1 overflow-y-auto py-8 pr-2">
            {section === "general" ? <GeneralSection tab={generalTab} /> : null}
            {section === "hotkeys" ? <HotkeysSection /> : null}
            {section === "data" ? <DataSection /> : null}
            {section === "about" ? <AboutSection /> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function GeneralSection({ tab }: { tab: GeneralTab }) {
  const appInfo = useAppStore((state) => state.appInfo);
  const preferences = useAppStore((state) => state.preferences);
  const toggleTheme = useAppStore((state) => state.toggleTheme);

  if (tab === "appearance") {
    const toggleThemeLabel = preferences.theme === "light" ? "切换到深色" : "切换到浅色";
    const themeStatus = preferences.theme === "light" ? "浅色" : "深色";

    return (
      <div className="grid gap-7">
        <SettingsGroup title="外观与语言" icon="◔">
          <SettingsRow
            action={
              <button
                aria-label={toggleThemeLabel}
                className="ff-settings-select"
                type="button"
                onClick={toggleTheme}
              >
                {themeStatus}
              </button>
            }
            description="在浅色和深色之间切换当前挂件与设置窗口的整体观感。"
            icon="◐"
            title="主题"
          />
          <SettingsRow
            action={<DisabledPill label="后续支持" />}
            description="当前版本固定使用简体中文；语言切换会在后续阶段再开放。"
            icon="文"
            title="界面语言"
          />
        </SettingsGroup>

        <SettingsGroup title="当前状态" icon="◎">
          <SettingsRow
            action={<ReadOnlyValue value={`v${appInfo?.version ?? "--"}`} />}
            description="显示当前桌面应用版本，便于后续验收和问题定位。"
            icon="ⓘ"
            title="版本信息"
          />
        </SettingsGroup>
      </div>
    );
  }

  if (tab === "window") {
    return (
      <div className="grid gap-7">
        <SettingsGroup title="窗口交互" icon="⌂">
          <SettingsRow
            description="Pin 开启后会固定在桌面层，而不是普通置顶层。"
            icon="⌘"
            title="Pin 行为"
          />
          <SettingsRow
            description="主挂件显示时会默认吸附在右下角，当前阶段仍不支持拖动和位置记忆。"
            icon="↘"
            title="右下角吸附"
          />
          <SettingsRow
            description="使用快捷键呼出时，会优先跟随当前鼠标所在屏幕回到右下角。"
            icon="⌨"
            title="快捷键召回"
          />
        </SettingsGroup>
      </div>
    );
  }

  return (
    <div className="grid gap-7">
      <SettingsGroup title="基础信息" icon="⏻">
        <SettingsRow
          action={<ReadOnlyValue value={`v${appInfo?.version ?? "--"}`} />}
          description="当前安装版本。"
          icon="ⓘ"
          title="版本"
        />
        <SettingsRow
          action={<ReadOnlyValue value={appInfo?.dataDir ?? "读取中..."} wide />}
          description="FloatFlow 的本地数据目录。"
          icon="🗂"
          title="数据目录"
        />
      </SettingsGroup>

      <SettingsGroup title="当前运行模式" icon="◫">
        <SettingsRow
          description="主窗口保持桌边挂件定位，设置改为独立窗口承载，不打断待办与便笺工作流。"
          icon="▣"
          title="窗口形态"
        />
      </SettingsGroup>
    </div>
  );
}

function HotkeysSection() {
  const hotkeys = useAppStore((state) => state.preferences.hotkeys);

  return (
    <div className="grid gap-7">
      <SettingsGroup title="快捷键说明" icon="⌨">
        <SettingsRow
          action={<ReadOnlyValue value={hotkeys.toggleMainWindow} />}
          description="呼出或隐藏右下角主挂件窗口。"
          icon="⌘"
          title="主窗口切换"
        />
        <SettingsRow
          action={<ReadOnlyValue value={hotkeys.quickCapture} />}
          description="快速进入主录入入口。"
          icon="✎"
          title="快速录入"
        />
      </SettingsGroup>
    </div>
  );
}

function DataSection() {
  const appInfo = useAppStore((state) => state.appInfo);
  const exportState = useAppStore((state) => state.exportState);

  return (
    <div className="grid gap-7">
      <SettingsGroup title="数据管理" icon="🗂">
        <SettingsRow
          action={
            <button
              aria-label="导出数据"
              className="ff-settings-primary"
              type="button"
              onClick={() => void exportState()}
            >
              导出数据
            </button>
          }
          description="将待办、便笺和偏好设置导出为 JSON 文件。"
          icon="⇩"
          title="数据导出"
        />
        <SettingsRow
          action={<ReadOnlyValue value={appInfo?.dataDir ?? "读取中..."} wide />}
          description="当前本地数据写入目录。"
          icon="📁"
          title="存储位置"
        />
        <SettingsRow
          action={<ReadOnlyValue value={`v${appInfo?.version ?? "--"}`} />}
          description="当前桌面应用版本。"
          icon="ⓘ"
          title="版本"
        />
      </SettingsGroup>
    </div>
  );
}

function AboutSection() {
  const appInfo = useAppStore((state) => state.appInfo);

  return (
    <div className="grid gap-7">
      <SettingsGroup title="关于 FloatFlow" icon="ⓘ">
        <SettingsRow
          action={<ReadOnlyValue value={`v${appInfo?.version ?? "--"}`} />}
          description="FloatFlow 是一个面向桌边挂件工作流的轻量桌面助手。"
          icon="◎"
          title="应用版本"
        />
        <SettingsRow
          description="当前版本聚焦待办、便笺、桌面吸附和独立设置窗口，不扩展订阅、多端同步等能力。"
          icon="◈"
          title="产品说明"
        />
      </SettingsGroup>
    </div>
  );
}

function SettingsGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-[var(--ff-settings-strong)]">
        <span aria-hidden className="ff-settings-group-icon">
          {icon}
        </span>
        <span>{title}</span>
      </div>
      <div className="ff-settings-card overflow-hidden rounded-[18px]">{children}</div>
    </section>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ff-settings-row flex items-center gap-4 px-5 py-5">
      <span aria-hidden className="ff-settings-row-icon">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold text-[var(--ff-settings-strong)]">{title}</p>
        <p className="mt-1 text-[13px] leading-6 text-[var(--ff-settings-muted)]">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function ReadOnlyValue({ value, wide = false }: { value: string; wide?: boolean }) {
  return (
    <span
      className={`ff-settings-value ${wide ? "max-w-[360px] whitespace-normal break-all text-right" : ""}`}
    >
      {value}
    </span>
  );
}

function DisabledPill({ label }: { label: string }) {
  return <span className="ff-settings-disabled">{label}</span>;
}

function sectionTitle(section: SettingsSection) {
  switch (section) {
    case "general":
      return "通用";
    case "hotkeys":
      return "快捷键";
    case "data":
      return "数据管理";
    case "about":
      return "关于";
  }
}
