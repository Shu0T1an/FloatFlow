import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/desktop/api", () => ({
  desktopApi: {
    loadAppState: vi.fn(),
    saveAppState: vi.fn().mockResolvedValue(undefined),
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

import { MemoPanel } from "@/features/memo/MemoPanel";
import { appStore, resetAppStore } from "@/store/app-store";

describe("MemoPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAppStore();
    appStore.getState().setMode("memo");
  });

  it("creates and displays memo cards from the inspiration entry", async () => {
    render(<MemoPanel />);

    fireEvent.click(screen.getByLabelText("Create memo from inspiration"));
    fireEvent.change(screen.getByLabelText("Memo editor"), {
      target: { value: "新的便笺标题\n记录新的灵感 #idea" },
    });

    await act(async () => {
      fireEvent.blur(screen.getByLabelText("Memo editor"));
      await vi.runOnlyPendingTimersAsync();
    });

    expect(appStore.getState().memos).toHaveLength(1);
    expect(screen.getByText("新的便笺标题")).toBeInTheDocument();
    expect(screen.getByText("记录新的灵感 #idea")).toBeInTheDocument();
  });

  it("filters memo cards locally and opens an existing memo in editor mode", async () => {
    appStore.getState().createMemoDraft("设计稿记录");
    appStore.getState().updateActiveMemoContent("设计稿记录\n处理桌边挂件布局");
    await act(async () => {
      await appStore.getState().flushActiveMemoSave();
    });
    appStore.getState().openMemoList();

    appStore.getState().createMemoDraft("接口备注");
    appStore.getState().updateActiveMemoContent("接口备注\n同步 schema 迁移");
    await act(async () => {
      await appStore.getState().flushActiveMemoSave();
    });
    appStore.getState().openMemoList();

    render(<MemoPanel />);

    fireEvent.click(screen.getByLabelText("Open memo search"));
    fireEvent.change(screen.getByLabelText("Filter memos"), {
      target: { value: "接口" },
    });

    expect(screen.getByText("接口备注")).toBeInTheDocument();
    expect(screen.queryByText("设计稿记录")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Open memo card 接口备注"));

    expect(appStore.getState().memoView).toBe("editor");
    expect(screen.getByLabelText("Memo editor")).toHaveValue("接口备注\n同步 schema 迁移");
  });
});
