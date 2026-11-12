import { describe, expect, it } from "vitest";
import { submissionMistakes } from "./submission-mistakes";

const fillBlank = {
  id: "e1",
  type: "fill_blank",
  prompt: "Điền từ",
  points: 3,
  data: { text: "1. It ___ me about ten minutes.\n2. Thank you ___ the help.\n3. I ___ see the step." },
  answerKey: { answers: [["takes"], ["for"], ["cannot", "can't"]] },
};

describe("submissionMistakes", () => {
  it("lists each wrong blank with its line, the learner's answer and the accepted answers", () => {
    const mistakes = submissionMistakes(fillBlank, { answers: ["Take", "for", ""] }, [false, true, false], 1);
    expect(mistakes).toEqual([
      { where: "1. It ___ me about ten minutes.", given: "Take", expected: "takes" },
      { where: "3. I ___ see the step.", given: "(trống)", expected: "cannot / can't" },
    ]);
  });

  it("returns nothing for a full score or an answer still waiting for the teacher", () => {
    expect(submissionMistakes(fillBlank, { answers: ["takes", "for", "cannot"] }, [true, true, true], 3)).toEqual([]);
    expect(submissionMistakes(fillBlank, { answers: ["x", "y", "z"] }, [], null)).toEqual([]);
  });

  it("finds the line of a blank when one line holds several", () => {
    const twoOnALine = { ...fillBlank, points: 2, data: { text: "I ___ and ___." }, answerKey: { answers: [["a"], ["b"]] } };
    expect(submissionMistakes(twoOnALine, { answers: ["a", "c"] }, [true, false], 1)).toEqual([{ where: "I ___ and ___.", given: "c", expected: "b" }]);
  });

  it("shows just the word for a vocabulary line", () => {
    const quiz = { ...fillBlank, points: 2, data: { text: "chair: ___\ntable: ___" }, answerKey: { answers: [["cái ghế"], ["cái bàn", "bàn"]] } };
    expect(submissionMistakes(quiz, { answers: ["cái ghế", "cái ghế"] }, [true, false], 1)).toEqual([{ where: "table", given: "cái ghế", expected: "cái bàn / bàn" }]);
  });

  it("names the pair for a wrong match", () => {
    const matching = { id: "e2", type: "matching", prompt: "Nối", points: 2, data: { left: ["chair", "box"], right: ["cái hộp", "cái ghế"] }, answerKey: { matches: [1, 0] } };
    expect(submissionMistakes(matching, { matches: [0, -1] }, [false, false], 0)).toEqual([
      { where: "chair", given: "cái hộp", expected: "cái ghế" },
      { where: "box", given: "(chưa nối)", expected: "cái hộp" },
    ]);
  });

  it("shows the whole answer for an exercise graded as a whole", () => {
    const choice = { id: "e3", type: "multiple_choice", prompt: "Chọn", points: 1, data: { options: ["a", "b"] }, answerKey: { correct: [1] } };
    expect(submissionMistakes(choice, { selected: [0] }, [false], 0)).toEqual([{ where: "Cả bài", given: "a", expected: "b" }]);
  });

  it("does not throw on a malformed key", () => {
    expect(() => submissionMistakes({ ...fillBlank, answerKey: null }, { answers: ["x"] }, [false], 0)).not.toThrow();
  });
});
