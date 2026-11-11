import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/forms/action-state";
import { EXERCISE_TYPES, buildExerciseContent, defaultEditorPayload, toEditorPayload } from "./exercise-content";

function built(type: Parameters<typeof buildExerciseContent>[0], payload: unknown) {
  const result = buildExerciseContent(type, payload);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("buildExerciseContent", () => {
  it("keeps correct answers out of the learner-visible data", () => {
    const { data, answerKey } = built("multiple_choice", { options: ["cat", "dog", "bird"], correct: [2, 0, 2] });
    expect(data).toEqual({ options: ["cat", "dog", "bird"] });
    expect(answerKey).toEqual({ correct: [0, 2] });
  });

  it("hides the listening transcript in the answer key", () => {
    const { data, answerKey } = built("listening", { transcript: "It is raining.", options: ["rain", "sun"], correct: [0] });
    expect(JSON.stringify(data)).not.toContain("raining");
    expect(answerKey.transcript).toBe("It is raining.");
  });

  it("requires one answer line per blank", () => {
    expect(buildExerciseContent("fill_blank", { text: "I ___ a ___.", answers: [["am"]] }).ok).toBe(false);
    expect(buildExerciseContent("fill_blank", { text: "No blank here", answers: [["x"]] }).ok).toBe(false);
    expect(built("fill_blank", { text: "I ___ a ___.", answers: [["am", "'m"], ["student"]] }).answerKey).toEqual({
      answers: [["am", "'m"], ["student"]],
    });
  });

  it("stores the matching right column sorted and maps each left item to it", () => {
    const { data, answerKey } = built("matching", {
      pairs: [
        { left: "dog", right: "woof" },
        { left: "cat", right: "meow" },
      ],
    });
    expect(data).toEqual({ left: ["dog", "cat"], right: ["meow", "woof"] });
    expect(answerKey).toEqual({ matches: [1, 0] });
  });

  it("rejects bad input", () => {
    expect(buildExerciseContent("multiple_choice", { options: ["a", "b"], correct: [5] }).ok).toBe(false);
    expect(buildExerciseContent("multiple_choice", { options: ["a", "A"], correct: [0] }).ok).toBe(false);
    expect(buildExerciseContent("matching", { pairs: [{ left: "a", right: "x" }, { left: "a", right: "y" }] }).ok).toBe(false);
    expect(buildExerciseContent("ordering", { sentence: "Hello" }).ok).toBe(false);
    expect(buildExerciseContent("speaking", { maxSeconds: 5 }).ok).toBe(false);
    expect(buildExerciseContent("writing", null).ok).toBe(false);
  });
});

describe("toEditorPayload", () => {
  const samples = {
    multiple_choice: { options: ["a", "b"], correct: [1] },
    listening: { transcript: "Hello there.", options: ["hi", "bye"], correct: [0] },
    fill_blank: { text: "She ___ tea.", answers: [["drinks", "likes"]] },
    matching: { pairs: [{ left: "one", right: "một" }, { left: "two", right: "hai" }] },
    ordering: { sentence: "I like green tea" },
    writing: { minWords: 80 },
    speaking: { maxSeconds: 90 },
  };

  it.each(EXERCISE_TYPES)("restores what the teacher typed for %s", (type) => {
    const { data, answerKey } = built(type, samples[type]);
    expect(toEditorPayload(type, data, answerKey)).toEqual(samples[type]);
  });

  it("falls back to an empty editor when stored content is broken", () => {
    expect(toEditorPayload("matching", { nonsense: true }, null)).toEqual(defaultEditorPayload("matching"));
  });
});

describe("slugify", () => {
  it("removes Vietnamese accents and punctuation", () => {
    expect(slugify("Giao tiếp cơ bản: Đi chợ!")).toBe("giao-tiep-co-ban-di-cho");
    expect(slugify("!!!")).toBe("");
  });
});
