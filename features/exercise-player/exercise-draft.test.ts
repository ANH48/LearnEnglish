import { describe, expect, it } from "vitest";
import { draftFromResponse, emptyDraft, toPartialResponse, toResponse } from "./exercise-draft";
import { type LearnerExercise, responseText } from "./learner-exercise";

const base = { id: "x", prompt: "p", points: 1, autoGraded: true };
const choice: LearnerExercise = { ...base, type: "multiple_choice", options: ["a", "b", "c"] };
const blanks: LearnerExercise = { ...base, type: "fill_blank", text: "I ___ a ___." };
const ordering: LearnerExercise = { ...base, type: "ordering", tokens: ["a", "is", "a", "this"] };
const writing: LearnerExercise = { ...base, type: "writing", autoGraded: false };

describe("exercise drafts", () => {
  it("saves a half-filled answer during an attempt but does not let it be submitted as practice", () => {
    const draft = { ...emptyDraft(blanks), answers: ["am", ""] };
    expect(toPartialResponse(blanks, draft)).toEqual({ answers: ["am", ""] });
    expect(toResponse(blanks, draft)).toBeNull();
  });
  it("restores a saved choice and saved blanks", () => {
    expect(draftFromResponse(choice, { selected: [2] }).selected).toEqual([2]);
    expect(draftFromResponse(blanks, { answers: ["am"] }).answers).toEqual(["am", ""]);
  });
  it("restores an ordering answer with repeated words onto different buttons", () => {
    const draft = draftFromResponse(ordering, { tokens: ["this", "a", "a"] });
    expect(draft.tokens).toEqual(["this", "a", "a"]);
    expect(draft.used).toEqual([3, 0, 2]);
  });
  it("starts an ordering answer over when the saved words no longer match the exercise", () => {
    expect(draftFromResponse(ordering, { tokens: ["gone"] })).toMatchObject({ tokens: [], used: [] });
  });
  it("restores written text and treats blank text as no practice answer", () => {
    expect(draftFromResponse(writing, { text: "Hello" }).text).toBe("Hello");
    expect(toResponse(writing, { ...emptyDraft(writing), text: "   " })).toBeNull();
  });
  it("falls back to an empty draft for anything that is not a saved answer", () => {
    expect(draftFromResponse(choice, null)).toEqual(emptyDraft(choice));
    expect(draftFromResponse(choice, { selected: "2" }).selected).toEqual([]);
  });
});

describe("responseText", () => {
  const stored = (type: string, data: unknown) => ({ id: "x", type, prompt: "p", points: 1, data, answerKey: {} });
  it("names the chosen options", () => {
    expect(responseText(stored("multiple_choice", { options: ["a", "b"] }), { selected: [1] })).toBe("b");
  });
  it("shows matched pairs and skips unmatched ones", () => {
    expect(responseText(stored("matching", { left: ["cat", "dog"], right: ["chó", "mèo"] }), { matches: [1, -1] })).toBe("cat = mèo");
  });
  it("is empty when nothing was answered", () => {
    expect(responseText(stored("fill_blank", { text: "___" }), { answers: [" "] })).toBe("");
    expect(responseText(stored("writing", {}), null)).toBe("");
  });
});
