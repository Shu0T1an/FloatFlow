import { describe, expect, it } from "vitest";
import { extractTags } from "@/shared/lib/tags";

describe("extractTags", () => {
  it("extracts unique unicode tags from memo content", () => {
    expect(extractTags("记录 #灵感 和 #MVP 再重复一次 #灵感")).toEqual([
      "#灵感",
      "#MVP",
    ]);
  });

  it("returns an empty list when no tags exist", () => {
    expect(extractTags("just plain text")).toEqual([]);
  });
});
