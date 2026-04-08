import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { desktopApiMock, listenForShortcutEventsMock } = vi.hoisted(() => ({
  desktopApiMock: {
    loadAppState: vi.fn(),
    saveAppState: vi.fn(),
    exportAppState: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    setWindowOpacity: vi.fn(),
    toggleMainWindow: vi.fn(),
    openSettingsWindow: vi.fn(),
    closeSettingsWindow: vi.fn(),
    registerGlobalShortcuts: vi.fn(),
    getCurrentWindowKind: vi.fn(),
    getAppInfo: vi.fn(),
    listenForAppStateEvents: vi.fn(),
  },
  listenForShortcutEventsMock: vi.fn(),
}));

vi.mock("@/desktop/api", () => ({
  desktopApi: desktopApiMock,
  listenForShortcutEvents: listenForShortcutEventsMock,
}));

import App from "@/app/App";
import { createDefaultState } from "@/shared/domain/app-state";
import { resetAppStore } from "@/store/app-store";

describe("App", () => {
  beforeEach(() => {
    desktopApiMock.loadAppState.mockResolvedValue(createDefaultState());
    desktopApiMock.saveAppState.mockResolvedValue(undefined);
    desktopApiMock.exportAppState.mockResolvedValue(undefined);
    desktopApiMock.setAlwaysOnTop.mockResolvedValue(undefined);
    desktopApiMock.setWindowOpacity.mockResolvedValue(undefined);
    desktopApiMock.toggleMainWindow.mockResolvedValue(undefined);
    desktopApiMock.openSettingsWindow.mockResolvedValue(undefined);
    desktopApiMock.closeSettingsWindow.mockResolvedValue(undefined);
    desktopApiMock.registerGlobalShortcuts.mockResolvedValue(undefined);
    desktopApiMock.getCurrentWindowKind.mockResolvedValue("main");
    desktopApiMock.getAppInfo.mockResolvedValue({
      version: "0.1.0",
      dataDir: "D:/FloatFlow/state",
    });
    desktopApiMock.listenForAppStateEvents.mockResolvedValue(() => undefined);
    listenForShortcutEventsMock.mockResolvedValue(() => undefined);
    resetAppStore();
    vi.clearAllMocks();
  });

  it("renders the loading view without entering a selector update loop", () => {
    desktopApiMock.loadAppState.mockImplementation(() => new Promise(() => undefined));

    expect(() => render(<App />)).not.toThrow();
    expect(screen.getByText("FloatFlow")).toBeInTheDocument();
  });
});
