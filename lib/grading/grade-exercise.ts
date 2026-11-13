import { z } from "zod";

/**
 * Auto-grading for the five machine-gradable exercise types. Pure functions:
 * stored answer key + learner response in, a ratio between 0 and 1 out.
 * Writing and speaking are graded by a teacher (phase 03) and return null here.
 */

export const AUTO_GRADED_TYPES = ["multiple_choice", "listening", "fill_blank", "matching", "ordering"] as const;
export type AutoGradedType = (typeof AUTO_GRADED_TYPES)[number];

export function isAutoGraded(type: string): type is AutoGradedType {
  return (AUTO_GRADED_TYPES as readonly string[]).includes(type);
}

// Postgres jsonb cannot store NUL, so it is rejected here rather than failing on save.
const shortText = z.string().max(200).refine((value) => !value.includes("\u0000"));
// Limits match what the exercise editor allows (see exercise-content.ts).
const responseSchemas = {
  multiple_choice: z.object({ selected: z.array(z.number().int().nonnegative()).max(8) }),
  listening: z.object({ selected: z.array(z.number().int().nonnegative()).max(8) }),
  fill_blank: z.object({ answers: z.array(shortText).max(30) }),
  matching: z.object({ matches: z.array(z.number().int().min(-1)).max(12) }),
  ordering: z.object({ tokens: z.array(shortText).max(60) }),
};

/** The response with unknown fields removed, or null when it does not fit the exercise type. This is what gets stored. */
export function parseResponse(type: string, response: unknown): Record<string, unknown> | null {
  if (!isAutoGraded(type)) return null;
  const parsed = responseSchemas[type].safeParse(response);
  return parsed.success ? parsed.data : null;
}

/** Types a teacher grades by hand. */
export function needsManualGrading(type: string): boolean {
  return type === "writing" || type === "speaking";
}

/**
 * A fill-in exercise the teacher chose to grade by hand. Applies to practice in a
 * lesson only: inside an assessment the same exercise is still graded automatically.
 */
export function isTeacherGradedFillBlank(type: string, data: unknown): boolean {
  return type === "fill_blank" && (data as { teacherGraded?: unknown } | null)?.teacherGraded === true;
}

const writingSchema =z.object({ text: z.string().max(10_000).refine((value) => !value.includes("\u0000")) });

/** A written answer with unknown fields removed, or null when it is not one. */
export function parseWritingResponse(response: unknown): { text: string } | null {
  const parsed = writingSchema.safeParse(response);
  return parsed.success ? parsed.data : null;
}

export type ExerciseResponse = { [K in AutoGradedType]: z.infer<(typeof responseSchemas)[K]> };
export type Graded = { ratio: number; parts: boolean[] };

// Vietnamese allows the tone mark on either vowel of "oa", "oe", "uy" (hoà / hòa, thuỷ / thủy).
const TONE_PLACEMENT: Record<string, string> = {
  oà: "òa", oá: "óa", oả: "ỏa", oã: "õa", oạ: "ọa",
  oè: "òe", oé: "óe", oẻ: "ỏe", oẽ: "õe", oẹ: "ọe",
  uỳ: "ùy", uý: "úy", uỷ: "ủy", uỹ: "ũy", uỵ: "ụy",
};
const TONE_PLACEMENT_PATTERN = new RegExp(Object.keys(TONE_PLACEMENT).join("|"), "g");

/** Case, surrounding/repeated spaces, curly apostrophes and where a Vietnamese tone mark sits do not count as mistakes. */
export function normalizeAnswer(text: string): string {
  // NFC: Vietnamese typed with combining marks must equal the precomposed form.
  return text
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .replace(TONE_PLACEMENT_PATTERN, (pair) => TONE_PLACEMENT[pair]);
}

/**
 * What a learner may have meant by one blank. A word often has several meanings and learners
 * list them ("sửa, sửa chữa"), so the whole text and each listed piece are tried; one accepted
 * piece is enough. The whole text comes first for answers that contain a comma themselves.
 * A trailing full stop is not part of a meaning.
 */
function answerCandidates(text: string): string[] {
  const pieces = [text, ...text.split(/[,;/]/)].map((piece) => normalizeAnswer(piece).replace(/[.!]+$/, "").trim()).filter((candidate) => candidate !== "");
  // "chiếc ghế" and "một cái ghế" name the same thing as "ghế": the counting word in front may be left out.
  return pieces.flatMap((piece) => [piece, piece.replace(LEADING_COUNT_WORDS, "")]).filter((candidate) => candidate !== "");
}
const LEADING_COUNT_WORDS = /^((một|1|những|các|cái|chiếc|con|cây|quả|trái|tờ|bức) )+/;

const whole = (correct: boolean): Graded => ({ ratio: correct ? 1 : 0, parts: [correct] });
const perPart = (parts: boolean[]): Graded => ({
  ratio: parts.length === 0 ? 0 : parts.filter(Boolean).length / parts.length,
  parts,
});

/**
 * Returns null when the type is not auto-graded, the response does not have the
 * expected shape, or the stored answer key is malformed (never throws).
 */
export function gradeExercise(type: string, answerKey: unknown, response: unknown): Graded | null {
  try {
    return gradeUnchecked(type, answerKey, response);
  } catch {
    return null;
  }
}

function gradeUnchecked(type: string, answerKey: unknown, response: unknown): Graded | null {
  if (!isAutoGraded(type)) return null;
  const parsed = responseSchemas[type].safeParse(response);
  if (!parsed.success) return null;
  const key = (answerKey ?? {}) as Record<string, unknown>;

  switch (type) {
    case "multiple_choice":
    case "listening": {
      // All or nothing: exactly the correct set, no extras.
      const correct = new Set(key.correct as number[]);
      const selected = new Set((parsed.data as ExerciseResponse["multiple_choice"]).selected);
      return whole(correct.size > 0 && correct.size === selected.size && [...correct].every((i) => selected.has(i)));
    }
    case "fill_blank": {
      const accepted = key.answers as string[][];
      const given = (parsed.data as ExerciseResponse["fill_blank"]).answers;
      return perPart(accepted.map((options, i) => {
          // An empty response never earns credit, even if a broken key lists "" as accepted.
          const acceptedTexts = new Set(options.map(normalizeAnswer));
          return answerCandidates(given[i] ?? "").some((candidate) => acceptedTexts.has(candidate));
        }),
      );
    }
    case "matching": {
      const matches = key.matches as number[];
      const given = (parsed.data as ExerciseResponse["matching"]).matches;
      return perPart(matches.map((right, i) => given[i] === right));
    }
    case "ordering": {
      const tokens = key.tokens as string[];
      const given = (parsed.data as ExerciseResponse["ordering"]).tokens;
      return whole(given.length === tokens.length && tokens.every((t, i) => normalizeAnswer(t) === normalizeAnswer(given[i])));
    }
  }
}

/** Points earned, rounded to 2 decimals. */
export function scoreFor(ratio: number, points: number): number {
  return Math.round(ratio * points * 100) / 100;
}
