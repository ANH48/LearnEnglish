import { describe, expect, it } from "vitest";
import { formatVietnamDateTime, parseVietnamLocal, toVietnamLocalInput } from "./vietnam-time";

describe("vietnam-time", () => {
  it("reads a typed time as UTC+7", () => {
    expect(parseVietnamLocal("2026-11-12T08:00")).toEqual(new Date("2026-11-12T01:00:00Z"));
  });
  it("crosses midnight correctly", () => {
    expect(parseVietnamLocal("2026-11-12T03:30")).toEqual(new Date("2026-11-11T20:30:00Z"));
  });
  it("rejects anything that is not a datetime-local value", () => {
    expect(parseVietnamLocal("")).toBeNull();
    expect(parseVietnamLocal("2026-11-12")).toBeNull();
    expect(parseVietnamLocal("2026-13-40T99:99")).toBeNull();
  });
  it("round-trips through the input format", () => {
    const instant = new Date("2026-11-12T01:00:00Z");
    expect(toVietnamLocalInput(instant)).toBe("2026-11-12T08:00");
    expect(parseVietnamLocal(toVietnamLocalInput(instant))).toEqual(instant);
  });
  it("formats for display in Vietnam time", () => {
    expect(formatVietnamDateTime(new Date("2026-11-11T20:30:00Z"))).toBe("03:30 12/11/2026");
  });
});
