import { describe, expect, it } from "vitest";
import { normalizeAnswer, scoreFor } from "./grade-exercise";

describe("normalizeAnswer edge cases", () => {
  it("treats tabs and newlines like spaces", () => {
    expect(normalizeAnswer("a\tb")).toBe("a b");
    expect(normalizeAnswer("a\nb")).toBe("a b");
    expect(normalizeAnswer("\r\n a \t\t b \r\n")).toBe("a b");
  });

  it("collapses runs of mixed whitespace to one space", () => {
    expect(normalizeAnswer("one \t\n  two")).toBe("one two");
  });

  it("maps every curly or backtick apostrophe in one string to a straight one", () => {
    expect(normalizeAnswer("It’s ‘fine’ `ok`")).toBe("it's 'fine' 'ok'");
  });

  it("empty and whitespace-only answers normalize to empty string", () => {
    expect(normalizeAnswer("")).toBe("");
    expect(normalizeAnswer(" \t\n ")).toBe("");
  });

  it("lowercases non-ASCII letters too", () => {
    expect(normalizeAnswer("ÉCOLE")).toBe("école");
  });
});

describe("scoreFor edge cases", () => {
  it("rounds half up at the 2nd decimal", () => {
    expect(scoreFor(0.125, 1)).toBe(0.13);
    expect(scoreFor(1 / 3, 3)).toBe(1);
    expect(scoreFor(2 / 3, 4)).toBe(2.67);
  });

  it("zero points always gives zero", () => {
    expect(scoreFor(1, 0)).toBe(0);
    expect(scoreFor(0.5, 0)).toBe(0);
  });

  it("partial ratio of a whole-number max stays within 0..points", () => {
    for (const ratio of [0, 0.2, 0.5, 0.75, 1]) {
      const score = scoreFor(ratio, 10);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });
});
