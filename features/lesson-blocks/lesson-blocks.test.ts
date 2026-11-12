import { describe, expect, it } from "vitest";
import { buildExerciseContent, toEditorPayload } from "@/features/exercises/exercise-content";
import { toLearnerExercise } from "@/features/exercise-player/learner-exercise";
import { isTeacherGradedFillBlank, normalizeAnswer } from "@/lib/grading/grade-exercise";
import { blockAudioIds, blockExerciseIds, parseLessonBlocks, splitBold } from "./lesson-blocks";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

const stored = [
  { type: "sentences", title: "20 câu", items: [{ en: "It **works** now.", vi: "Giờ chạy rồi." }], audioId: id(1), segments: [[0.3, 1.9]] },
  { type: "notes", title: "Cấu trúc", items: [{ pattern: "does not work", meaning: "hỏng", examples: "" }], text: "" },
  { type: "exercise", title: "Bài tập", exerciseId: id(2) },
  { type: "story", label: "Truyện 1", title: "The light", paragraphs: ["One **evening**."], audio: { slow: id(3), normal: id(4) } },
  { type: "vocabulary", title: "Từ", items: [{ en: "chair", vi: "cái ghế" }], quizExerciseId: id(5) },
  { type: "translation", title: "Bản dịch", paragraphs: ["Một buổi tối."] },
];

describe("lesson blocks", () => {
  it("reads every block type and lists the audio and exercises they use", () => {
    const blocks = parseLessonBlocks(stored);
    expect(blocks.map((block) => block.type)).toEqual(["sentences", "notes", "exercise", "story", "vocabulary", "translation"]);
    expect(blockAudioIds(blocks)).toEqual([id(1), id(3), id(4)]);
    expect(blockExerciseIds(blocks)).toEqual([id(2), id(5)]);
  });

  it("treats anything malformed as no blocks instead of throwing", () => {
    for (const value of [null, "text", {}, [{ type: "unknown" }], [{ type: "story", paragraphs: [] }], [{ type: "sentences", items: [{ en: "x" }], audioId: "not-a-uuid" }]]) {
      expect(parseLessonBlocks(value)).toEqual([]);
    }
  });

  it("splits bold markers", () => {
    expect(splitBold("**Does** the light **work**?")).toEqual([
      { text: "Does", bold: true },
      { text: " the light ", bold: false },
      { text: "work", bold: true },
      { text: "?", bold: false },
    ]);
    expect(splitBold("plain")).toEqual([{ text: "plain", bold: false }]);
  });
});

describe("fill-in exercise graded by the teacher", () => {
  const payload = { text: "It ___ me ten minutes.", answers: [["takes"]], teacherGraded: true };

  it("keeps the flag through build and back into the editor", () => {
    const built = buildExerciseContent("fill_blank", payload);
    if (!built.ok) throw new Error(built.error);
    expect(built.data).toEqual({ text: payload.text, teacherGraded: true });
    expect(toEditorPayload("fill_blank", built.data, built.answerKey)).toEqual(payload);
    expect(isTeacherGradedFillBlank("fill_blank", built.data)).toBe(true);
  });

  it("is off unless set, and only applies to fill-in exercises", () => {
    const built = buildExerciseContent("fill_blank", { text: payload.text, answers: payload.answers });
    if (!built.ok) throw new Error(built.error);
    expect(built.data).toEqual({ text: payload.text });
    expect(isTeacherGradedFillBlank("fill_blank", built.data)).toBe(false);
    expect(isTeacherGradedFillBlank("fill_blank", null)).toBe(false);
    expect(isTeacherGradedFillBlank("multiple_choice", { teacherGraded: true })).toBe(false);
  });

  it("tells the learner's browser the exercise is not auto-graded, without the answers", () => {
    const exercise = { id: id(1), type: "fill_blank", prompt: "p", points: 1, data: { text: payload.text, teacherGraded: true }, answerKey: { answers: [["takes"]] } };
    const learner = toLearnerExercise(exercise);
    expect(learner.autoGraded).toBe(false);
    expect(JSON.stringify(learner)).not.toContain("takes");
    expect(toLearnerExercise({ ...exercise, data: { text: payload.text } }).autoGraded).toBe(true);
  });
});

describe("Vietnamese answers", () => {
  it("accepts the same word typed with combining marks", () => {
    expect(normalizeAnswer("cái ghế".normalize("NFD"))).toBe(normalizeAnswer("Cái  ghế "));
  });
});
