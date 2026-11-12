import { describe, expect, it } from "vitest";
import { gradeExercise } from "@/lib/grading/grade-exercise";
import { type ChallengeExercise, shuffleExercise, shuffled } from "./challenge-shuffle";

/** Deterministic pseudo-random sequence, so every test run shuffles the same way. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const fillBlank: ChallengeExercise = {
  type: "fill_blank",
  prompt: "Điền từ",
  points: 4,
  data: { text: "1. It ___ me ten minutes.\n2. Thank you ___ the help.\n3. I ___ and ___ it." },
  answerKey: { answers: [["takes"], ["for"], ["see"], ["fix"]] },
};

/** The right answer of every blank of a shuffled fill-in, read back by sentence. */
function rightAnswersBySentence(exercise: ChallengeExercise) {
  const answers = exercise.answerKey.answers as string[][];
  let next = 0;
  return (exercise.data.text as string).split("\n").map((line) => {
    const count = line.split("___").length - 1;
    const own = answers.slice(next, next + count).map((a) => a[0]);
    next += count;
    return `${line.replace(/^\d+\. /, "")} => ${own.join(",")}`;
  });
}

describe("shuffleExercise", () => {
  it("reorders fill-in sentences, keeps each answer with its sentence and renumbers", () => {
    const out = shuffleExercise(fillBlank, seeded(3))!;
    expect(rightAnswersBySentence(out).sort()).toEqual(rightAnswersBySentence(fillBlank).sort());
    expect((out.data.text as string).split("\n").map((l) => l.slice(0, 3))).toEqual(["1. ", "2. ", "3. "]);
    const right = (out.answerKey.answers as string[][]).map((a) => a[0]);
    expect(gradeExercise("fill_blank", out.answerKey, { answers: right })?.ratio).toBe(1);
  });

  it("keeps unnumbered lines as they are", () => {
    const quiz = { ...fillBlank, data: { text: "chair: ___\nbox: ___" }, answerKey: { answers: [["cái ghế"], ["cái hộp"]] } };
    const lines = (shuffleExercise(quiz, seeded(7))!.data.text as string).split("\n").sort();
    expect(lines).toEqual(["box: ___", "chair: ___"]);
  });

  it("moves the correct choices with the options", () => {
    const choice = { type: "multiple_choice", prompt: "p", points: 1, data: { options: ["a", "b", "c", "d"] }, answerKey: { correct: [1, 3] } };
    const out = shuffleExercise(choice, seeded(11))!;
    const picked = (out.answerKey.correct as number[]).map((i) => (out.data.options as string[])[i]).sort();
    expect(picked).toEqual(["b", "d"]);
  });

  it("keeps every matching pair", () => {
    const matching = { type: "matching", prompt: "p", points: 3, data: { left: ["chair", "box", "dark"], right: ["cái hộp", "cái ghế", "tối"] }, answerKey: { matches: [1, 0, 2] } };
    const out = shuffleExercise(matching, seeded(5))!;
    const pairs = (out.data.left as string[]).map((l, i) => `${l}=${(out.data.right as string[])[(out.answerKey.matches as number[])[i]]}`).sort();
    expect(pairs).toEqual(["box=cái hộp", "chair=cái ghế", "dark=tối"]);
  });

  it("only reorders the tokens of an ordering exercise", () => {
    const ordering = { type: "ordering", prompt: "p", points: 1, data: { tokens: ["a", "b", "c"] }, answerKey: { tokens: ["c", "a", "b"] } };
    const out = shuffleExercise(ordering, seeded(2))!;
    expect([...(out.data.tokens as string[])].sort()).toEqual(["a", "b", "c"]);
    expect(out.answerKey).toEqual(ordering.answerKey);
  });

  it("skips types a challenge does not use and content it cannot read", () => {
    expect(shuffleExercise({ ...fillBlank, type: "writing" }, Math.random)).toBeNull();
    expect(shuffleExercise({ ...fillBlank, type: "listening" }, Math.random)).toBeNull();
    expect(shuffleExercise({ ...fillBlank, answerKey: { answers: [["only one"]] } }, Math.random)).toBeNull();
  });

  it("shuffled keeps every item", () => {
    expect(shuffled([1, 2, 3, 4, 5], seeded(9)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
