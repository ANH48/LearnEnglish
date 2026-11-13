import { describe, expect, it } from "vitest";
import { solutionText, toLearnerExercise } from "@/features/exercise-player/learner-exercise";
import { type ExerciseTypeName, buildExerciseContent } from "@/features/exercises/exercise-content";
import { gradeExercise, normalizeAnswer, scoreFor } from "./grade-exercise";

/** Stored exercise built the same way the admin form builds it. */
function stored(type: ExerciseTypeName, payload: unknown) {
  const built = buildExerciseContent(type, payload);
  if (!built.ok) throw new Error(built.error);
  return { id: "ex-1", type, prompt: "Q", points: 4, data: built.data, answerKey: built.answerKey };
}

const mc = stored("multiple_choice", { options: ["a", "b", "c"], correct: [0, 2] });
const blank = stored("fill_blank", { text: "I ___ a ___.", answers: [["am", "'m"], ["student"]] });
const matching = stored("matching", { pairs: [{ left: "dog", right: "woof" }, { left: "cat", right: "meow" }] });
const ordering = stored("ordering", { sentence: "I like green tea" });
const listening = stored("listening", { transcript: "It is raining today.", options: ["rain", "sun"], correct: [0] });

describe("gradeExercise", () => {
  it("multiple choice is all or nothing and ignores order", () => {
    expect(gradeExercise("multiple_choice", mc.answerKey, { selected: [2, 0] })?.ratio).toBe(1);
    expect(gradeExercise("multiple_choice", mc.answerKey, { selected: [0] })?.ratio).toBe(0);
    expect(gradeExercise("multiple_choice", mc.answerKey, { selected: [0, 1, 2] })?.ratio).toBe(0);
    expect(gradeExercise("listening", listening.answerKey, { selected: [0] })?.ratio).toBe(1);
  });

  it("fill in the blank gives partial credit and forgives case, spaces and curly apostrophes", () => {
    expect(gradeExercise("fill_blank", blank.answerKey, { answers: ["  AM ", "Student"] })?.ratio).toBe(1);
    expect(gradeExercise("fill_blank", blank.answerKey, { answers: ["’m", "teacher"] })).toEqual({ ratio: 0.5, parts: [true, false] });
    expect(gradeExercise("fill_blank", blank.answerKey, { answers: ["am"] })?.ratio).toBe(0.5);
  });

  it("fill in the blank accepts a list of meanings when one of them is accepted", () => {
    const meanings = stored("fill_blank", { text: "fix ___ dinner ___ reply ___", answers: [["sửa", "sửa chữa"], ["bữa tối", "bữa ăn tối"], ["Yes, I am"]] });
    const grade = (answers: string[]) => gradeExercise("fill_blank", meanings.answerKey, { answers })?.parts;
    expect(grade(["Sửa, sửa chữa", "Buổi ăn tối, bữa tối", "yes, i am"])).toEqual([true, true, true]);
    expect(grade(["sửa / chữa", "bữa trưa; bữa ăn tối", "Yes"])).toEqual([true, true, false]);
    expect(grade(["chữa, vá", " , ", ""])).toEqual([false, false, false]);
  });

  it("fill in the blank forgives counting words, tone-mark placement and a final full stop", () => {
    const nouns = stored("fill_blank", { text: "chair ___ building ___ key ___", answers: [["ghế"], ["toà nhà"], ["chìa khóa"]] });
    const grade = (answers: string[]) => gradeExercise("fill_blank", nouns.answerKey, { answers })?.parts;
    expect(grade(["Chiếc ghế.", "tòa nhà", "một cái chìa khoá"])).toEqual([true, true, true]);
    expect(grade(["cái bàn", "nhà", "cái"])).toEqual([false, false, false]);
  });

  it("matching gives credit per pair", () => {
    // right column is stored sorted: ["meow", "woof"]; dog -> 1, cat -> 0
    expect(gradeExercise("matching", matching.answerKey, { matches: [1, 0] })?.ratio).toBe(1);
    expect(gradeExercise("matching", matching.answerKey, { matches: [1, 1] })?.ratio).toBe(0.5);
    expect(gradeExercise("matching", matching.answerKey, { matches: [-1, -1] })?.ratio).toBe(0);
  });

  it("ordering needs the exact word order", () => {
    expect(gradeExercise("ordering", ordering.answerKey, { tokens: ["I", "like", "green", "tea"] })?.ratio).toBe(1);
    expect(gradeExercise("ordering", ordering.answerKey, { tokens: ["I", "like", "tea", "green"] })?.ratio).toBe(0);
    expect(gradeExercise("ordering", ordering.answerKey, { tokens: ["I", "like"] })?.ratio).toBe(0);
  });

  it("returns null for teacher-graded types and malformed responses", () => {
    expect(gradeExercise("writing", {}, { text: "hello" })).toBeNull();
    expect(gradeExercise("speaking", {}, {})).toBeNull();
    expect(gradeExercise("multiple_choice", mc.answerKey, { selected: "0" })).toBeNull();
    expect(gradeExercise("multiple_choice", mc.answerKey, null)).toBeNull();
    expect(gradeExercise("fill_blank", blank.answerKey, { selected: [0] })).toBeNull();
  });
});

describe("scoreFor / normalizeAnswer", () => {
  it("rounds to 2 decimals", () => {
    expect(scoreFor(1 / 3, 4)).toBe(1.33);
    expect(scoreFor(1, 4)).toBe(4);
    expect(scoreFor(0, 4)).toBe(0);
  });

  it("normalizes spacing, case and apostrophes", () => {
    expect(normalizeAnswer("  Don’t   Go ")).toBe("don't go");
  });
});

describe("toLearnerExercise", () => {
  it("never carries the answer key to the browser", () => {
    for (const exercise of [mc, blank, matching, ordering, listening]) {
      const sent = JSON.stringify(toLearnerExercise(exercise));
      expect(sent).not.toContain("answerKey");
      expect(sent).not.toContain("correct");
      expect(sent).not.toContain("matches");
    }
    expect(JSON.stringify(toLearnerExercise(listening))).not.toContain("raining");
    expect(JSON.stringify(toLearnerExercise(blank))).not.toContain("student");
    // Ordering tokens arrive sorted, not in the answer's order.
    expect(toLearnerExercise(ordering).tokens).toEqual(["green", "I", "like", "tea"]);
  });

  it("only says whether several options may be ticked", () => {
    expect(toLearnerExercise(mc).multiple).toBe(true);
    expect(toLearnerExercise(listening).multiple).toBe(false);
    expect(toLearnerExercise(stored("writing", { minWords: 10 })).autoGraded).toBe(false);
  });
});

describe("solutionText", () => {
  it("describes the right answer for each type", () => {
    expect(solutionText(mc)).toBe("a; c");
    expect(solutionText(blank)).toBe("am / 'm; student");
    expect(solutionText(matching)).toBe("dog = woof; cat = meow");
    expect(solutionText(ordering)).toBe("I like green tea");
  });
});
