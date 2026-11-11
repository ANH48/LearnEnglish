import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/courses/tieng-anh-di-cho")).toBe("/courses/tieng-anh-di-cho");
    expect(safeNextPath("/learn/abc?x=1")).toBe("/learn/abc?x=1");
  });

  it("falls back for anything that could leave the site", () => {
    for (const value of [
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "evil.com",
      "",
      null,
      undefined,
      ["/learn"],
    ]) {
      expect(safeNextPath(value), JSON.stringify(value)).toBe("/learn");
    }
  });
});
