import { describe, expect, it } from "vitest";
import { solutionText, toLearnerExercise } from "./learner-exercise";

type Stored = Parameters<typeof toLearnerExercise>[0];
const row = (type: string, data: unknown, answerKey: unknown): Stored => ({
  id: "ex-x",
  type,
  prompt: "P",
  points: 2,
  data,
  answerKey,
});

describe("toLearnerExercise with malformed stored data", () => {
  it("null data and null answer key do not throw", () => {
    expect(() => toLearnerExercise(row("multiple_choice", null, null))).not.toThrow();
    expect(toLearnerExercise(row("multiple_choice", null, null))).toMatchObject({ options: [], multiple: false });
    expect(toLearnerExercise(row("fill_blank", null, null))).toMatchObject({ text: "" });
    expect(toLearnerExercise(row("matching", null, null))).toMatchObject({ left: [], right: [] });
    expect(toLearnerExercise(row("ordering", null, null))).toMatchObject({ tokens: [] });
  });

  it("non-array options become an empty list", () => {
    expect(toLearnerExercise(row("multiple_choice", { options: "abc" }, { correct: [0] })).options).toEqual([]);
    expect(toLearnerExercise(row("listening", { options: { 0: "a" } }, { correct: [0] })).options).toEqual([]);
  });

  it("non-string fill_blank text becomes empty", () => {
    expect(toLearnerExercise(row("fill_blank", { text: 123 }, { answers: [] })).text).toBe("");
  });

  it("non-array correct in answer key yields multiple=false", () => {
    expect(toLearnerExercise(row("multiple_choice", { options: ["a", "b"] }, { correct: "0,1" })).multiple).toBe(false);
  });

  it("answer key stored as a string does not throw or leak", () => {
    const exercise = row("multiple_choice", { options: ["a", "b"] }, "secret-answer");
    expect(() => toLearnerExercise(exercise)).not.toThrow();
    expect(JSON.stringify(toLearnerExercise(exercise))).not.toContain("secret-answer");
  });

  it("answer-key fields smuggled into data are not forwarded", () => {
    const sent = JSON.stringify(
      toLearnerExercise(row("fill_blank", { text: "I ___", answers: [["am"]], correct: [0] }, { answers: [["am"]] })),
    );
    expect(sent).not.toContain("answers");
    expect(sent).not.toContain("am");
  });

  it("writing and speaking never expose data fields beyond the base", () => {
    const sent = toLearnerExercise(row("writing", { minWords: 50, options: ["x"] }, {}));
    expect(sent.autoGraded).toBe(false);
    expect(sent.options).toBeUndefined();
  });
});

describe("solutionText with malformed stored data", () => {
  it("does not throw for null data and null answer key", () => {
    for (const type of ["multiple_choice", "listening", "fill_blank", "matching", "ordering", "writing"]) {
      expect(() => solutionText(row(type, null, null))).not.toThrow();
    }
  });

  it("multiple choice with no correct array does not throw", () => {
    expect(() => solutionText(row("multiple_choice", { options: ["a"] }, {}))).not.toThrow();
  });

  it("fill blank with non-array answers does not throw", () => {
    expect(() => solutionText(row("fill_blank", { text: "x ___" }, { answers: "am" }))).not.toThrow();
  });

  it("matching with missing match index never prints 'undefined'", () => {
    const text = solutionText(row("matching", { left: ["dog", "cat"], right: ["meow", "woof"] }, { matches: [1] }));
    expect(text).not.toContain("undefined");
  });

  it("ordering with no key tokens gives empty string", () => {
    expect(solutionText(row("ordering", { tokens: ["a", "b"] }, {}))).toBe("");
  });

  it("unknown type gives empty string", () => {
    expect(solutionText(row("speaking", {}, {}))).toBe("");
  });
});
