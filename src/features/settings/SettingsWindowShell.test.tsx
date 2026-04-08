import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { desktopApiMock } = vi.hoisted(() => ({
  desktopApiMock: {
    loadAppState: vi.fn(),
    saveAppState: vi.fn().mockResolvedValue(undefined),
    exportAppState: vi.fn().mockResolvedValue(undefined),
    setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
    setWindowOpacity: vi.fn().mockResolvedValue(undefined),
    toggleMainWindow: vi.fn().mockResolvedValue(undefined),
    openSettingsWindow: vi.fn().mockResolvedValue(undefined),
    closeSettingsWindow: vi.fn().mockResolvedValue(undefined),
    registerGlobalShortcuts: vi.fn().mockResolvedValue(undefined),
    getCurrentWindowKind: vi.fn().mockResolvedValue("settings"),
    getAppInfo: vi.fn().mockResolvedValue({
      version: "0.1.0",
      dataDir: "D:/FloatFlow/state",
    }),
    listenForAppStateEvents: vi.fn().mockResolvedValue(() => undefined),
  },
}));

vi.mock("@/desktop/api", () => ({
  desktopApi: desktopApiMock,
}));

import { SettingsWindowShell } from "@/features/settings/SettingsWindowShell";
import { appStore, resetAppStore } from "@/store/app-store";

describe("SettingsWindowShell", () => {
  beforeEach(() => {
    resetAppStore();
    appStore.setState({
      appInfo: {
        version: "0.1.0",
        dataDir: "D:/FloatFlow/state",
      },
    });
    vi.clearAllMocks();
  });

  it("renders the desktop-style settings layout", () => {
    render(<SettingsWindowShell />);

    expect(screen.getByRole("navigation", { name: "设置分类" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "通用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "快捷键" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "基础" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "窗口交互" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "外观" })).toBeInTheDocument();
  });

  it("shows app info and exports data from the data section", () => {
    render(<SettingsWindowShell />);

    fireEvent.click(screen.getByRole("button", { name: "数据管理" }));

    expect(screen.getByText("D:/FloatFlow/state")).toBeInTheDocument();
    expect(screen.getByText(/v0.1.0/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "导出数据" }));

    expect(desktopApiMock.exportAppState).toHaveBeenCalledTimes(1);
  });

  it("updates theme from the appearance tab", () => {
    render(<SettingsWindowShell />);

    fireEvent.click(screen.getByRole("tab", { name: "外观" }));
    fireEvent.click(screen.getByRole("button", { name: "切换到深色" }));

    expect(appStore.getState().preferences.theme).toBe("dark");
  });
});
