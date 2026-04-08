import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: vi.fn(),
}));

import { desktopApi } from "@/desktop/api";
import { invoke } from "@tauri-apps/api/core";

const invokeMock = vi.mocked(invoke);

describe("desktopApi.getCurrentWindowKind", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    invokeMock.mockReset();
    delete (window as Window & { __FLOATFLOW_WINDOW_KIND__?: unknown }).__FLOATFLOW_WINDOW_KIND__;
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it("returns settings when the bootstrap window hint marks it as a settings window", async () => {
    Object.defineProperty(window, "__FLOATFLOW_WINDOW_KIND__", {
      configurable: true,
      value: "settings",
    });

    await expect(desktopApi.getCurrentWindowKind()).resolves.toBe("settings");
  });

  it("returns settings when the window query marks it as a settings window", async () => {
    window.history.replaceState({}, "", "/?window=settings");

    await expect(desktopApi.getCurrentWindowKind()).resolves.toBe("settings");
  });

  it("falls back to main when no window hint is present outside tauri", async () => {
    await expect(desktopApi.getCurrentWindowKind()).resolves.toBe("main");
  });

  it("falls back to the tauri window label when no window hint is present", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {},
    });
    invokeMock.mockResolvedValue("settings");

    await expect(desktopApi.getCurrentWindowKind()).resolves.toBe("settings");

    expect(invokeMock).toHaveBeenCalledWith("get_current_window_label");
  });
});
