import { describe, expect, it } from "vitest";
import { EMPTY_ACTION_STATE, isUniqueViolation, slugify, validationFailed } from "./action-state";
import { z } from "zod";

describe("slugify", () => {
  it("strips Vietnamese diacritics including đ/Đ", () => {
    expect(slugify("Đường Đi Chợ")).toBe("duong-di-cho");
    expect(slugify("Tiếng Việt Ệ")).toBe("tieng-viet-e");
  });

  it("collapses separators and trims dashes", () => {
    expect(slugify("  Hello   World  ")).toBe("hello-world");
    expect(slugify("C++ & Java")).toBe("c-java");
    expect(slugify("--a--b--")).toBe("a-b");
  });

  it("keeps digits and returns empty for symbol-only input", () => {
    expect(slugify("Unit 2 Level-3")).toBe("unit-2-level-3");
    expect(slugify("   ")).toBe("");
  });

  it("is idempotent", () => {
    const once = slugify("Giao tiếp cơ bản");
    expect(slugify(once)).toBe(once);
  });
});

describe("isUniqueViolation", () => {
  it("detects Prisma P2002", () => {
    const err = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    expect(isUniqueViolation(err)).toBe(true);
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
  });

  it("rejects other codes and non-objects", () => {
    expect(isUniqueViolation({ code: "P2003" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("P2002")).toBe(false);
  });
});

describe("validationFailed", () => {
  it("maps zod issues to field errors with a generic message", () => {
    const parsed = z.object({ title: z.string().min(1), slug: z.string() }).safeParse({ title: "", slug: 1 });
    if (parsed.success) throw new Error("expected failure");
    const state = validationFailed(parsed.error);
    expect(state.error).toBe("Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.");
    expect(Object.keys(state.fieldErrors ?? {}).sort()).toEqual(["slug", "title"]);
    expect(state.fieldErrors?.title?.length).toBeGreaterThan(0);
  });

  it("EMPTY_ACTION_STATE carries no error", () => {
    expect(EMPTY_ACTION_STATE).toEqual({});
  });
});
