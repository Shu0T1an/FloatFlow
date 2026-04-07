import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/desktop/api", () => ({
  desktopApi: {
    loadAppState: vi.fn(),
    saveAppState: vi.fn().mockResolvedValue(undefined),
    exportAppState: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    setWindowOpacity: vi.fn(),
    toggleMainWindow: vi.fn(),
    registerGlobalShortcuts: vi.fn(),
  },
}));

import { TodoPanel } from "@/features/todo/TodoPanel";
import { appStore, resetAppStore } from "@/store/app-store";

describe("TodoPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAppStore();
  });

  it("creates tasks and groups them into active and completed sections", async () => {
    render(<TodoPanel />);

    fireEvent.change(screen.getByLabelText("Todo input"), {
      target: { value: "设计桌边挂件!!!" },
    });
    fireEvent.keyDown(screen.getByLabelText("Todo input"), { key: "Enter" });
    await vi.runOnlyPendingTimersAsync();

    fireEvent.change(screen.getByLabelText("Todo input"), {
      target: { value: "整理视觉细节" },
    });
    fireEvent.keyDown(screen.getByLabelText("Todo input"), { key: "Enter" });
    await vi.runOnlyPendingTimersAsync();

    fireEvent.click(screen.getByLabelText("toggle-设计桌边挂件"));

    expect(screen.getByText("进行中")).toBeInTheDocument();
    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(appStore.getState().todos.find((todo) => todo.title === "设计桌边挂件")?.completed).toBe(true);
  });

  it("filters visible tasks locally without mutating persisted data", async () => {
    appStore.getState().addTodo("配置 Tauri 窗口");
    appStore.getState().addTodo("整理 memo 卡片");
    await vi.runOnlyPendingTimersAsync();

    render(<TodoPanel />);

    fireEvent.click(screen.getByLabelText("Open todo search"));
    fireEvent.change(screen.getByLabelText("Filter todos"), {
      target: { value: "Tauri" },
    });

    expect(screen.getByText("配置 Tauri 窗口")).toBeInTheDocument();
    expect(screen.queryByText("整理 memo 卡片")).not.toBeInTheDocument();
    expect(appStore.getState().todos).toHaveLength(2);
  });
});
