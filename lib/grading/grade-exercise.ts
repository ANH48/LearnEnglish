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

export type ExerciseResponse = { [K in AutoGradedType]: z.infer<(typeof responseSchemas)[K]> };
export type Graded = { ratio: number; parts: boolean[] };

/** Case, surrounding/repeated spaces and curly apostrophes do not count as mistakes. */
export function normalizeAnswer(text: string): string {
  return text.trim().replace(/\s+/g, " ").replace(/[’‘`]/g, "'").toLowerCase();
}

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
          const answer = normalizeAnswer(given[i] ?? "");
          return answer !== "" && options.some((o) => normalizeAnswer(o) === answer);
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
