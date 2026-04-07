import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/desktop/api", () => ({
  desktopApi: {
    loadAppState: vi.fn(),
    saveAppState: vi.fn().mockResolvedValue(undefined),
    exportAppState: vi.fn(),
    setAlwaysOnTop: vi.fn().mockResolvedValue(undefined),
    setWindowOpacity: vi.fn().mockResolvedValue(undefined),
    toggleMainWindow: vi.fn(),
    registerGlobalShortcuts: vi.fn(),
  },
}));

import { WindowShell } from "@/app/WindowShell";
import { appStore, resetAppStore } from "@/store/app-store";

describe("WindowShell", () => {
  beforeEach(() => {
    resetAppStore();
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
});
