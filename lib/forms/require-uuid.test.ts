import { describe, expect, it } from "vitest";
import { requireUuid, uniqueIds } from "./require-uuid";

const ID = "c6621c5a-6ff1-4a40-8801-62da0d262ee9";

describe("requireUuid", () => {
  it("accepts plain UUID strings", () => {
    expect(() => requireUuid(ID, ID)).not.toThrow();
  });

  it("rejects Prisma filter objects and other non-UUID values", () => {
    // A crafted server-action request can send any JSON in place of an id.
    for (const value of [{ not: ID }, { in: [ID] }, [ID], "abc", "", null, undefined, 42]) {
      expect(() => requireUuid(value)).toThrow();
    }
    expect(() => requireUuid(ID, { not: ID })).toThrow();
  });
});

describe("uniqueIds", () => {
  it("drops duplicates", () => {
    expect(uniqueIds([ID, ID, "x"])).toEqual([ID, "x"]);
  });
});
