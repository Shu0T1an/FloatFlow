import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/desktop/api", () => ({
  desktopApi: {
    loadAppState: vi.fn(),
    saveAppState: vi.fn(),
    exportAppState: vi.fn().mockResolvedValue(undefined),
    setAlwaysOnTop: vi.fn(),
    setWindowOpacity: vi.fn(),
    toggleMainWindow: vi.fn(),
    openSettingsWindow: vi.fn().mockResolvedValue(undefined),
    closeSettingsWindow: vi.fn().mockResolvedValue(undefined),
    registerGlobalShortcuts: vi.fn(),
    getCurrentWindowKind: vi.fn().mockResolvedValue("main"),
    getAppInfo: vi.fn().mockResolvedValue({
      version: "0.1.0",
      dataDir: "D:/FloatFlow/state",
    }),
    listenForAppStateEvents: vi.fn().mockResolvedValue(() => undefined),
  },
}));

import { StatusFooter } from "@/app/StatusFooter";
import { desktopApi } from "@/desktop/api";
import { appStore, resetAppStore } from "@/store/app-store";

describe("StatusFooter", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("shows current mode in the footer", () => {
    appStore.setState({ mode: "memo" });

    render(<StatusFooter />);

    expect(screen.getByText("当前模式")).toBeInTheDocument();
    expect(screen.getByText("便笺")).toBeInTheDocument();
  });

  it("keeps only the settings entry in the footer", () => {
    render(<StatusFooter />);

    expect(screen.queryByRole("button", { name: "数据导出" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "系统设置" }));

    expect(desktopApi.openSettingsWindow).toHaveBeenCalledTimes(1);
  });
});
