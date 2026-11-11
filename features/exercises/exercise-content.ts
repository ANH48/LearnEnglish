import { z } from "zod";

/**
 * Converts between what a teacher types in the exercise editor (the "editor
 * payload") and what is stored: `data` (safe to show learners) and `answerKey`
 * (never sent to learners before they submit).
 * Reused by the auto-graders (phase 02) and the AI draft import (phase 04).
 */

export const EXERCISE_TYPE_LABELS = {
  multiple_choice: "Trắc nghiệm",
  fill_blank: "Điền từ",
  listening: "Nghe",
  matching: "Nối cặp",
  ordering: "Sắp xếp câu",
  writing: "Viết",
  speaking: "Nói",
} as const;

export type ExerciseTypeName = keyof typeof EXERCISE_TYPE_LABELS;
export const EXERCISE_TYPES = Object.keys(EXERCISE_TYPE_LABELS) as ExerciseTypeName[];

/** Marks a blank inside fill-in-the-blank text. */
export const BLANK = "___";

const text = z.string().trim().min(1, "Không được để trống nội dung bài tập").max(2000, "Nội dung quá dài");
const choiceShape = {
  options: z.array(text).min(2, "Cần ít nhất 2 lựa chọn").max(8),
  correct: z.array(z.number().int().nonnegative()).min(1, "Chọn ít nhất 1 đáp án đúng"),
};

const editorSchemas = {
  multiple_choice: z.object(choiceShape),
  listening: z.object({ transcript: text.max(2000), ...choiceShape }),
  fill_blank: z.object({ text, answers: z.array(z.array(text).min(1).max(10)).min(1).max(30) }),
  matching: z.object({ pairs: z.array(z.object({ left: text, right: text })).min(2, "Cần ít nhất 2 cặp").max(12) }),
  ordering: z.object({ sentence: text }),
  writing: z.object({ minWords: z.number().int().min(0).max(2000) }),
  speaking: z.object({ maxSeconds: z.number().int().min(10).max(600) }),
};

export type EditorPayload = { [K in ExerciseTypeName]: z.infer<(typeof editorSchemas)[K]> };
type Json = Record<string, unknown>;
export type BuiltContent = { ok: true; data: Json; answerKey: Json } | { ok: false; error: string };

const fail = (error: string): BuiltContent => ({ ok: false, error });
const sorted = (items: string[]) => [...items].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
const hasDuplicates = (items: string[]) => new Set(items.map((i) => i.toLowerCase())).size !== items.length;

function checkChoices(options: string[], correct: number[]): string | null {
  if (hasDuplicates(options)) return "Các lựa chọn không được trùng nhau.";
  if (correct.some((index) => index >= options.length)) return "Đáp án đúng không khớp với lựa chọn.";
  return null;
}

export function buildExerciseContent(type: ExerciseTypeName, payload: unknown): BuiltContent {
  const parsed = editorSchemas[type].safeParse(payload);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Nội dung bài tập chưa hợp lệ.");
  const p = parsed.data as EditorPayload[ExerciseTypeName];

  switch (type) {
    case "multiple_choice":
    case "listening": {
      const { options, correct } = p as EditorPayload["listening"];
      const problem = checkChoices(options, correct);
      if (problem) return fail(problem);
      const key: Json = { correct: [...new Set(correct)].sort((a, b) => a - b) };
      // The transcript is what the audio says, so it stays with the hidden answer key.
      if (type === "listening") key.transcript = (p as EditorPayload["listening"]).transcript;
      return { ok: true, data: { options }, answerKey: key };
    }
    case "fill_blank": {
      const { text: rawBody, answers } = p as EditorPayload["fill_blank"];
      // Any run of 3 or more underscores is one blank, stored in the canonical form.
      const body = rawBody.replace(/_{3,}/g, BLANK);
      const blanks = body.split(BLANK).length - 1;
      if (blanks === 0) return fail(`Câu cần có ít nhất một chỗ trống, viết bằng ${BLANK}.`);
      if (blanks !== answers.length) return fail(`Có ${blanks} chỗ trống nhưng ${answers.length} dòng đáp án.`);
      return { ok: true, data: { text: body }, answerKey: { answers } };
    }
    case "matching": {
      const { pairs } = p as EditorPayload["matching"];
      const left = pairs.map((pair) => pair.left);
      const rightAuthored = pairs.map((pair) => pair.right);
      if (hasDuplicates(left) || hasDuplicates(rightAuthored)) return fail("Mỗi vế chỉ được xuất hiện một lần.");
      // The right column is stored sorted so its order does not reveal the pairing.
      const right = sorted(rightAuthored);
      return { ok: true, data: { left, right }, answerKey: { matches: rightAuthored.map((r) => right.indexOf(r)) } };
    }
    case "ordering": {
      const tokens = (p as EditorPayload["ordering"]).sentence.split(/\s+/);
      if (tokens.length < 2) return fail("Câu cần có ít nhất 2 từ.");
      return { ok: true, data: { tokens: sorted(tokens) }, answerKey: { tokens } };
    }
    case "writing":
      return { ok: true, data: { minWords: (p as EditorPayload["writing"]).minWords }, answerKey: {} };
    case "speaking":
      return { ok: true, data: { maxSeconds: (p as EditorPayload["speaking"]).maxSeconds }, answerKey: {} };
  }
}

export function defaultEditorPayload<T extends ExerciseTypeName>(type: T): EditorPayload[T] {
  const defaults: EditorPayload = {
    multiple_choice: { options: ["", ""], correct: [] },
    listening: { transcript: "", options: ["", ""], correct: [] },
    fill_blank: { text: "", answers: [] },
    matching: { pairs: [] },
    ordering: { sentence: "" },
    writing: { minWords: 50 },
    speaking: { maxSeconds: 60 },
  };
  return defaults[type];
}

/** Rebuilds the editor payload from stored content; falls back to an empty editor if the shape is unexpected. */
export function toEditorPayload(type: ExerciseTypeName, data: unknown, answerKey: unknown): EditorPayload[ExerciseTypeName] {
  const d = (data ?? {}) as Record<string, never>;
  const k = (answerKey ?? {}) as Record<string, never>;
  try {
    const candidates: { [K in ExerciseTypeName]: () => unknown } = {
      multiple_choice: () => ({ options: d.options, correct: k.correct }),
      listening: () => ({ transcript: k.transcript, options: d.options, correct: k.correct }),
      fill_blank: () => ({ text: d.text, answers: k.answers }),
      matching: () => ({
        pairs: (d.left as string[]).map((left, i) => ({ left, right: (d.right as string[])[(k.matches as number[])[i]] })),
      }),
      ordering: () => ({ sentence: (k.tokens as string[]).join(" ") }),
      writing: () => ({ minWords: d.minWords }),
      speaking: () => ({ maxSeconds: d.maxSeconds }),
    };
    return editorSchemas[type].parse(candidates[type]()) as EditorPayload[ExerciseTypeName];
  } catch {
    return defaultEditorPayload(type);
  }
}
