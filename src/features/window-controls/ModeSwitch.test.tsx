import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/desktop/api", () => ({
  desktopApi: {
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
}));

import { ModeSwitch } from "@/features/window-controls/ModeSwitch";
import { appStore, resetAppStore } from "@/store/app-store";

describe("ModeSwitch", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("defaults to todo mode and switches to memo", () => {
    render(<ModeSwitch />);

    expect(appStore.getState().mode).toBe("todo");

    fireEvent.click(screen.getByRole("button", { name: "便笺" }));

    expect(appStore.getState().mode).toBe("memo");
  });
});
