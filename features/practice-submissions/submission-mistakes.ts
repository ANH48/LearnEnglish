import { BLANK } from "@/features/exercises/exercise-content";
import { responseText, solutionText } from "@/features/exercise-player/learner-exercise";

type StoredExercise = { id: string; type: string; prompt: string; points: number; data: unknown; answerKey: unknown };

/** One wrong part of a submission, as the teacher reads it: where, what the learner gave, what was expected. */
export type Mistake = { where: string; given: string; expected: string };

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.map((v) => (typeof v === "string" ? v : "")) : []);
const booleans = (value: unknown): boolean[] => (Array.isArray(value) ? value.map((v) => v === true) : []);
const shorten = (text: string) => (text.length > 90 ? `${text.slice(0, 87)}...` : text);

/** The line of the exercise text each blank sits on, so "blank 3" reads as "It ___ me about ten minutes." */
function blankLines(text: string): string[] {
  const lines: string[] = [];
  for (const line of text.split("\n")) {
    const count = line.split(BLANK).length - 1;
    // "table: ___" (vocabulary quiz) reads better as just "table".
    const label = count === 1 ? line.replace(/:\s*_{3}\s*$/, "") : line;
    for (let i = 0; i < count; i++) lines.push(shorten(label.trim()));
  }
  return lines;
}

/**
 * The wrong parts of one auto-graded submission. Blank- and pair-based exercises
 * list each wrong part; exercises graded as a whole list one entry when wrong.
 * Never throws: a malformed stored key or response yields what can be read.
 */
export function submissionMistakes(exercise: StoredExercise, response: unknown, partsValue: unknown, score: number | null): Mistake[] {
  if (score === null || score >= exercise.points) return [];
  const data = (exercise.data ?? {}) as Record<string, unknown>;
  const key = (exercise.answerKey ?? {}) as Record<string, unknown>;
  const given = (typeof response === "object" && response !== null ? response : {}) as Record<string, unknown>;
  const parts = booleans(partsValue);

  if (exercise.type === "fill_blank" && parts.length > 0) {
    const lines = blankLines(typeof data.text === "string" ? data.text : "");
    const answers = strings(given.answers);
    const accepted = Array.isArray(key.answers) ? (key.answers as unknown[]) : [];
    return parts.flatMap((ok, i) =>
      ok ? [] : [{ where: lines[i] ?? `Chỗ trống ${i + 1}`, given: answers[i]?.trim() || "(trống)", expected: strings(accepted[i]).join(" / ") }],
    );
  }

  if (exercise.type === "matching" && parts.length > 0) {
    const left = strings(data.left);
    const right = strings(data.right);
    const matches = Array.isArray(given.matches) ? (given.matches as unknown[]) : [];
    const keyMatches = Array.isArray(key.matches) ? (key.matches as unknown[]) : [];
    const pick = (value: unknown) => (typeof value === "number" && right[value] !== undefined ? right[value] : "(chưa nối)");
    return parts.flatMap((ok, i) => (ok ? [] : [{ where: left[i] ?? `Cặp ${i + 1}`, given: pick(matches[i]), expected: pick(keyMatches[i]) }]));
  }

  return [{ where: "Cả bài", given: responseText(exercise, response) || "(trống)", expected: solutionText(exercise) }];
}
