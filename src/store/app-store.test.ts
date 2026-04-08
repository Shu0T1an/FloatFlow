import { beforeEach, describe, expect, it, vi } from "vitest";

const { desktopApiMock } = vi.hoisted(() => ({
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
}));

vi.mock("@/desktop/api", () => ({
  desktopApi: desktopApiMock,
}));

import { createDefaultState } from "@/shared/domain/app-state";
import { appStore, resetAppStore } from "@/store/app-store";

describe("appStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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
    resetAppStore();
    vi.clearAllMocks();
  });

  it("hydrates legacy memo data into memos and defaults to todo mode", async () => {
    desktopApiMock.loadAppState.mockResolvedValue({
      schemaVersion: 1,
      todos: [],
      memo: {
        id: "main-memo",
        content: "迁移标题\n迁移正文 #legacy",
        tags: [],
        createdAt: "1700000000",
        updatedAt: "1700000100",
      },
      preferences: {
        theme: "light",
        windowOpacity: 0.86,
        alwaysOnTop: true,
        defaultMode: "memo",
        hotkeys: {
          toggleMainWindow: "Alt+Space",
          quickCapture: "Alt+N",
        },
      },
    });

    await appStore.getState().hydrate();

    expect(appStore.getState().memos).toHaveLength(1);
    expect(appStore.getState().memos[0]?.title).toBe("迁移标题");
    expect(appStore.getState().mode).toBe("todo");
  });

  it("creates a memo draft from quick capture in memo mode", async () => {
    appStore.getState().setMode("memo");

    await appStore.getState().captureInput("记录一个新灵感 #idea");
    await vi.runOnlyPendingTimersAsync();

    expect(appStore.getState().memos).toHaveLength(1);
    expect(appStore.getState().memos[0]?.title).toBe("记录一个新灵感 #idea");
    expect(appStore.getState().memoView).toBe("editor");
    expect(appStore.getState().activeMemoId).toBe(appStore.getState().memos[0]?.id);
  });

  it("autosaves active memo content after 2 seconds", async () => {
    appStore.getState().createMemoDraft("灵感标题");
    const firstId = appStore.getState().activeMemoId;

    appStore.getState().updateActiveMemoContent("灵感标题\n补充细节 #tag");

    expect(desktopApiMock.saveAppState).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);

    expect(desktopApiMock.saveAppState).toHaveBeenCalledTimes(1);
    expect(appStore.getState().memos.find((memo) => memo.id === firstId)?.tags).toEqual(["#tag"]);
  });

  it("does not persist local filters", async () => {
    appStore.getState().setTodoFilter("react");
    appStore.getState().setMemoFilter("灵感");

    await vi.runOnlyPendingTimersAsync();

    expect(desktopApiMock.saveAppState).not.toHaveBeenCalled();
  });

  it("replaces persisted state without overwriting local filters", () => {
    appStore.setState({
      todoFilter: "react",
      memoFilter: "灵感",
      isSearchOpen: true,
    });

    appStore.getState().replacePersistedState({
      ...createDefaultState(),
      preferences: {
        ...createDefaultState().preferences,
        theme: "dark",
      },
      todos: [
        {
          id: "todo-1",
          title: "同步过来的任务",
          completed: false,
          priority: "medium",
          createdAt: "2026-04-07T00:00:00.000Z",
          updatedAt: "2026-04-07T00:00:00.000Z",
        },
      ],
    });

    expect(appStore.getState().preferences.theme).toBe("dark");
    expect(appStore.getState().todos).toHaveLength(1);
    expect(appStore.getState().todoFilter).toBe("react");
    expect(appStore.getState().memoFilter).toBe("灵感");
    expect(appStore.getState().isSearchOpen).toBe(true);
  });
});
