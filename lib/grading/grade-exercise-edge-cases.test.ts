import { describe, expect, it } from "vitest";
import { gradeExercise } from "./grade-exercise";

const MC_KEY = { correct: [0, 2] };

describe("gradeExercise edge cases: multiple choice / listening", () => {
  it("duplicate indices in selected collapse to a set", () => {
    // [0,0] is one distinct option, so it does not equal the 2-option key
    expect(gradeExercise("multiple_choice", MC_KEY, { selected: [0, 0] })?.ratio).toBe(0);
    // [0,0,2] has the right distinct set -> counted correct (duplicates are not penalized)
    expect(gradeExercise("multiple_choice", MC_KEY, { selected: [0, 0, 2] })?.ratio).toBe(1);
  });

  it("empty selection scores 0, never correct", () => {
    expect(gradeExercise("multiple_choice", MC_KEY, { selected: [] })?.ratio).toBe(0);
    // empty key cannot be satisfied by an empty selection either
    expect(gradeExercise("multiple_choice", { correct: [] }, { selected: [] })?.ratio).toBe(0);
  });

  it("rejects non-integer, negative, NaN and over-long selections", () => {
    expect(gradeExercise("multiple_choice", MC_KEY, { selected: [0.5] })).toBeNull();
    expect(gradeExercise("multiple_choice", MC_KEY, { selected: [-1] })).toBeNull();
    expect(gradeExercise("multiple_choice", MC_KEY, { selected: [Number.NaN] })).toBeNull();
    expect(gradeExercise("multiple_choice", MC_KEY, { selected: Array(9).fill(0) })).toBeNull();
    expect(gradeExercise("multiple_choice", MC_KEY, { selected: Array(8).fill(0) })).not.toBeNull();
  });

  it("missing or malformed answerKey does not throw and never grants credit", () => {
    expect(() => gradeExercise("multiple_choice", undefined, { selected: [0] })).not.toThrow();
    expect(gradeExercise("multiple_choice", undefined, { selected: [0] })?.ratio).toBe(0);
    expect(gradeExercise("multiple_choice", null, { selected: [] })?.ratio).toBe(0);
    expect(gradeExercise("multiple_choice", { correct: "0" }, { selected: [0] })?.ratio).toBe(0);
  });

  it("a non-iterable correct value (number) does not throw", () => {
    expect(() => gradeExercise("multiple_choice", { correct: 5 }, { selected: [5] })).not.toThrow();
  });
});

describe("gradeExercise edge cases: fill in the blank", () => {
  const key = { answers: [["am", "'m"], ["student"]] };

  it("response shorter than key scores the missing blanks as wrong", () => {
    expect(gradeExercise("fill_blank", key, { answers: [] })).toEqual({ ratio: 0, parts: [false, false] });
  });

  it("response longer than key ignores the extra entries", () => {
    expect(gradeExercise("fill_blank", key, { answers: ["am", "student", "extra"] })?.ratio).toBe(1);
  });

  it("empty-string response never matches a non-empty accepted answer", () => {
    expect(gradeExercise("fill_blank", key, { answers: ["", ""] })?.ratio).toBe(0);
  });

  it("an accepted answer that is blank does not give credit for an empty response", () => {
    // Authoring guard: buildExerciseContent requires non-empty text, so this key is malformed.
    expect(gradeExercise("fill_blank", { answers: [[""]] }, { answers: [""] })?.ratio).toBe(0);
  });

  it("rejects an answer string longer than 200 chars and more than 30 blanks", () => {
    expect(gradeExercise("fill_blank", key, { answers: ["x".repeat(201)] })).toBeNull();
    expect(gradeExercise("fill_blank", key, { answers: Array(31).fill("a") })).toBeNull();
  });

  it("malformed answerKey does not throw", () => {
    expect(() => gradeExercise("fill_blank", undefined, { answers: ["a"] })).not.toThrow();
    expect(() => gradeExercise("fill_blank", { answers: "am" }, { answers: ["am"] })).not.toThrow();
    expect(() => gradeExercise("fill_blank", { answers: [null] }, { answers: ["am"] })).not.toThrow();
  });
});

describe("gradeExercise edge cases: matching and ordering", () => {
  it("matching: response shorter than key scores missing pairs as wrong", () => {
    expect(gradeExercise("matching", { matches: [1, 0] }, { matches: [1] })).toEqual({ ratio: 0.5, parts: [true, false] });
    expect(gradeExercise("matching", { matches: [1, 0] }, { matches: [] })?.ratio).toBe(0);
  });

  it("matching: rejects non-integer and below -1 values", () => {
    expect(gradeExercise("matching", { matches: [1] }, { matches: [1.5] })).toBeNull();
    expect(gradeExercise("matching", { matches: [1] }, { matches: [-2] })).toBeNull();
    expect(gradeExercise("matching", { matches: [1] }, { matches: [Number.NaN] })).toBeNull();
  });

  it("matching: empty key gives ratio 0, not NaN", () => {
    expect(gradeExercise("matching", { matches: [] }, { matches: [] })).toEqual({ ratio: 0, parts: [] });
  });

  it("ordering: length mismatch is wrong even when prefix matches", () => {
    expect(gradeExercise("ordering", { tokens: ["a", "b"] }, { tokens: ["a", "b", "b"] })?.ratio).toBe(0);
  });

  it("ordering: tokens compared with normalization (case and curly apostrophe)", () => {
    expect(gradeExercise("ordering", { tokens: ["Don't", "go"] }, { tokens: ["don’t", "GO"] })?.ratio).toBe(1);
  });

  it("ordering: rejects more than 200 tokens and tokens over 200 chars", () => {
    expect(gradeExercise("ordering", { tokens: ["a"] }, { tokens: Array(201).fill("a") })).toBeNull();
    expect(gradeExercise("ordering", { tokens: ["a"] }, { tokens: ["x".repeat(201)] })).toBeNull();
  });

  it("matching and ordering with malformed answerKey do not throw", () => {
    expect(() => gradeExercise("matching", undefined, { matches: [0] })).not.toThrow();
    expect(() => gradeExercise("ordering", undefined, { tokens: ["a"] })).not.toThrow();
    expect(() => gradeExercise("ordering", { tokens: null }, { tokens: ["a"] })).not.toThrow();
  });
});

describe("gradeExercise edge cases: unknown or non-object responses", () => {
  it("undefined and primitive responses return null", () => {
    expect(gradeExercise("ordering", { tokens: ["a"] }, undefined)).toBeNull();
    expect(gradeExercise("matching", { matches: [] }, "matches")).toBeNull();
    expect(gradeExercise("fill_blank", { answers: [] }, 42)).toBeNull();
  });

  it("unknown type returns null without touching the key", () => {
    expect(gradeExercise("essay", undefined, {})).toBeNull();
  });
});
