import { describe, expect, it } from "vitest";
import { applyRuntimeHost } from "@/app/runtime-host";

describe("applyRuntimeHost", () => {
  it("marks tauri host on the root element", () => {
    const root = document.createElement("html");

    applyRuntimeHost(root, true);

    expect(root.dataset.host).toBe("tauri");
  });

  it("marks browser host on the root element", () => {
    const root = document.createElement("html");

    applyRuntimeHost(root, false);

    expect(root.dataset.host).toBe("browser");
  });
});
