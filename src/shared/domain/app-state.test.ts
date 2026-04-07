import { describe, expect, it } from "vitest";
import {
  clampOpacity,
  createDefaultState,
  deriveMemoPreview,
  deriveMemoTitle,
  normalizeAppState,
} from "@/shared/domain/app-state";

describe("app-state", () => {
  it("defaults to todo mode with schema version 2", () => {
    const state = createDefaultState();

    expect(state.schemaVersion).toBe(2);
    expect(state.preferences.defaultMode).toBe("todo");
    expect(state.memos).toEqual([]);
  });

  it("migrates a legacy single memo into a memo card", () => {
    const state = normalizeAppState({
      schemaVersion: 1,
      todos: [],
      memo: {
        id: "main-memo",
        content: "灵感标题\n补充说明 #idea",
        tags: [],
        createdAt: "1700000000",
        updatedAt: "1700000100",
      },
      preferences: {
        theme: "light",
        windowOpacity: 0.72,
        alwaysOnTop: true,
        defaultMode: "memo",
        hotkeys: {
          toggleMainWindow: "Alt+Space",
          quickCapture: "Alt+N",
        },
      },
    });

    expect(state.schemaVersion).toBe(2);
    expect(state.memos).toHaveLength(1);
    expect(state.memos[0]?.title).toBe("灵感标题");
    expect(state.memos[0]?.content).toContain("补充说明");
    expect(state.memos[0]?.tags).toEqual(["#idea"]);
  });

  it("does not create an empty migrated memo card", () => {
    const state = normalizeAppState({
      schemaVersion: 1,
      memo: {
        id: "main-memo",
        content: "   ",
        tags: [],
        createdAt: "1700000000",
        updatedAt: "1700000100",
      },
    });

    expect(state.memos).toEqual([]);
  });

  it("uses clean Chinese fallback copy for memo title and preview", () => {
    expect(deriveMemoTitle("")).toBe("新便笺");
    expect(deriveMemoPreview("")).toBe("点击编辑内容...");
  });

  it("keeps opacity clamped between 0.1 and 1", () => {
    expect(clampOpacity(1.4)).toBe(1);
    expect(clampOpacity(0.01)).toBe(0.1);
  });
});
