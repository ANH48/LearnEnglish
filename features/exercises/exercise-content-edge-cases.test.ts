import { describe, expect, it } from "vitest";
import { buildExerciseContent, toEditorPayload } from "./exercise-content";

describe("multiple_choice edge cases", () => {
  it("collapses duplicate correct indices into one sorted list", () => {
    const r = buildExerciseContent("multiple_choice", { options: ["a", "b", "c"], correct: [2, 0, 2, 0] });
    expect(r.ok && r.answerKey).toEqual({ correct: [0, 2] });
  });

  it("rejects whitespace-only options (trimmed to empty)", () => {
    const r = buildExerciseContent("multiple_choice", { options: ["cat", "   "], correct: [0] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Không được để trống nội dung bài tập");
  });

  it("trims option text before storing it", () => {
    const r = buildExerciseContent("multiple_choice", { options: ["  cat ", "dog"], correct: [0] });
    expect(r.ok && r.data).toEqual({ options: ["cat", "dog"] });
  });

  it("treats options that differ only by case or spacing as duplicates", () => {
    expect(buildExerciseContent("multiple_choice", { options: ["Cat", "cat "], correct: [0] }).ok).toBe(false);
  });

  it("rejects a correct index that points past the last option", () => {
    expect(buildExerciseContent("multiple_choice", { options: ["a", "b"], correct: [2] }).ok).toBe(false);
  });
});

describe("fill_blank edge cases", () => {
  it("treats any run of 3+ underscores as one blank, stored in canonical form", () => {
    for (const text of ["a ____ b", "a ______ b"]) {
      const r = buildExerciseContent("fill_blank", { text, answers: [["x"]] });
      expect(r.ok && r.data).toEqual({ text: "a ___ b" });
    }
    expect(buildExerciseContent("fill_blank", { text: "a ______ b", answers: [["x"], ["y"]] }).ok).toBe(false);
  });

  it("counts blanks separated by a space as two", () => {
    const r = buildExerciseContent("fill_blank", { text: "a ___ ___ b", answers: [["x"], ["y"]] });
    expect(r.ok && r.answerKey).toEqual({ answers: [["x"], ["y"]] });
  });

  it("rejects an answer line that is whitespace only", () => {
    expect(buildExerciseContent("fill_blank", { text: "I ___ here.", answers: [["   "]] }).ok).toBe(false);
  });

  it("rejects a blank with no accepted answers", () => {
    expect(buildExerciseContent("fill_blank", { text: "I ___ here.", answers: [[]] }).ok).toBe(false);
  });
});

describe("matching edge cases", () => {
  it("keeps '=' inside the right side and round-trips it", () => {
    const payload = {
      pairs: [
        { left: "formula", right: "a=b" },
        { left: "plain", right: "c" },
      ],
    };
    const r = buildExerciseContent("matching", payload);
    if (!r.ok) throw new Error(r.error);
    expect(r.data).toEqual({ left: ["formula", "plain"], right: ["a=b", "c"] });
    expect(toEditorPayload("matching", r.data, r.answerKey)).toEqual(payload);
  });

  it("rejects right values that differ only by case", () => {
    const r = buildExerciseContent("matching", {
      pairs: [
        { left: "x", right: "Meow" },
        { left: "y", right: "meow" },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects a left item repeated with different casing", () => {
    const r = buildExerciseContent("matching", {
      pairs: [
        { left: "Dog", right: "a" },
        { left: "dog", right: "b" },
      ],
    });
    expect(r.ok).toBe(false);
  });
});

describe("ordering edge cases", () => {
  it("splits on runs of any whitespace and ignores leading/trailing spaces", () => {
    const r = buildExerciseContent("ordering", { sentence: "   I   like\ttea  " });
    expect(r.ok && r.answerKey).toEqual({ tokens: ["I", "like", "tea"] });
    expect(r.ok && r.data).toEqual({ tokens: ["I", "like", "tea"] });
  });

  it("rejects one word plus padding", () => {
    expect(buildExerciseContent("ordering", { sentence: "Hello      " }).ok).toBe(false);
  });

  it("rejects a whitespace-only sentence", () => {
    expect(buildExerciseContent("ordering", { sentence: "     " }).ok).toBe(false);
  });

  it("answer key keeps authored order; learner data is alphabetical", () => {
    const r = buildExerciseContent("ordering", { sentence: "zebra apple mango" });
    expect(r.ok && r.answerKey).toEqual({ tokens: ["zebra", "apple", "mango"] });
    expect(r.ok && r.data).toEqual({ tokens: ["apple", "mango", "zebra"] });
  });
});
