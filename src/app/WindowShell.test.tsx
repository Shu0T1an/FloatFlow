import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { desktopApiMock } = vi.hoisted(() => ({
  desktopApiMock: {
    loadAppState: vi.fn(),
    saveAppState: vi.fn().mockResolvedValue(undefined),
    exportAppState: vi.fn().mockResolvedValue(undefined),
    setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
    setWindowOpacity: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@/desktop/api", () => ({
  desktopApi: desktopApiMock,
}));

import { WindowShell } from "@/app/WindowShell";
import { appStore, resetAppStore } from "@/store/app-store";

describe("WindowShell", () => {
  beforeEach(() => {
    resetAppStore();
    desktopApiMock.exportAppState.mockClear();
  });

  it("marks the shell as solid when opacity is 100%", () => {
    appStore.setState((state) => ({
      preferences: {
        ...state.preferences,
        windowOpacity: 1,
      },
    }));

    render(<WindowShell />);

    expect(screen.getByTestId("widget-shell")).toHaveAttribute("data-visual-mode", "solid");
  });

  it("shows clear pin feedback and toggles to the unlocked state", async () => {
    appStore.setState((state) => ({
      preferences: {
        ...state.preferences,
        alwaysOnTop: true,
      },
    }));

    render(<WindowShell />);

    expect(screen.getByRole("button", { name: "取消固定到桌面" })).toBeInTheDocument();
    expect(screen.getByText("已吸附右下角")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "取消固定到桌面" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "固定到桌面" })).toBeInTheDocument();
    });
  });

  it("opens the standalone settings window from the footer", () => {
    render(<WindowShell />);

    fireEvent.click(screen.getByRole("button", { name: "系统设置" }));

    expect(desktopApiMock.openSettingsWindow).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "系统设置" })).not.toBeInTheDocument();
  });
});
