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
    registerGlobalShortcuts: vi.fn(),
  },
}));

import { StatusFooter } from "@/app/StatusFooter";
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

  it("opens settings with shortcut and window behavior guidance", () => {
    render(<StatusFooter />);

    fireEvent.click(screen.getByRole("button", { name: "系统设置" }));

    expect(screen.getByText("快捷键")).toBeInTheDocument();
    expect(screen.getByText("Alt+Space")).toBeInTheDocument();
    expect(screen.getByText("显示时自动回到右下角")).toBeInTheDocument();
    expect(screen.getByText("100% 为实色，低于 100% 为玻璃态")).toBeInTheDocument();
    expect(screen.getByText("当前版本位置固定，拖动将在后续版本支持")).toBeInTheDocument();
  });
});
