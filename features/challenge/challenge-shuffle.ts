import { BLANK } from "@/features/exercises/exercise-content";

/** An exercise as stored, and as a challenge item: same shape, with its own shuffled order. */
export type ChallengeExercise = { type: string; prompt: string; points: number; data: Record<string, unknown>; answerKey: Record<string, unknown> };

/** Types a challenge can show and grade on its own. Listening needs its audio, writing and speaking a teacher. */
export const CHALLENGE_TYPES = ["fill_blank", "multiple_choice", "matching", "ordering"] as const;

export type Random = () => number;

/** Fisher-Yates on a copy. */
export function shuffled<T>(items: readonly T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const strings = (value: unknown): string[] | null => (Array.isArray(value) && value.every((v) => typeof v === "string") ? value : null);
const numbers = (value: unknown): number[] | null => (Array.isArray(value) && value.every((v) => typeof v === "number") ? value : null);
const NUMBERED = /^\s*\d+[.)]\s*/;

/**
 * The same exercise with its sentences, options or pairs in a new order and the
 * answer key moved along with them. Content and accepted answers never change.
 * Returns null for a type a challenge does not use, or stored content it cannot read.
 */
export function shuffleExercise(exercise: ChallengeExercise, random: Random): ChallengeExercise | null {
  const { data, answerKey } = exercise;
  switch (exercise.type) {
    case "fill_blank": {
      const text = typeof data.text === "string" ? data.text : null;
      const answers = Array.isArray(answerKey.answers) ? (answerKey.answers as unknown[]) : null;
      if (!text || !answers) return null;
      // Each line holding blanks is one sentence; it moves together with its answers.
      const lines: { text: string; answers: unknown[] }[] = [];
      let next = 0;
      for (const line of text.split("\n")) {
        const count = line.split(BLANK).length - 1;
        if (count > 0) lines.push({ text: line, answers: answers.slice(next, next + count) });
        next += count;
      }
      if (lines.length === 0 || next !== answers.length) return null;
      const order = shuffled(lines, random);
      const numbered = lines.every((line) => NUMBERED.test(line.text));
      const body = order.map((line, i) => (numbered ? `${i + 1}. ${line.text.replace(NUMBERED, "")}` : line.text)).join("\n");
      return { ...exercise, data: { text: body }, answerKey: { answers: order.flatMap((line) => line.answers) } };
    }
    case "multiple_choice": {
      const options = strings(data.options);
      const correct = numbers(answerKey.correct);
      if (!options || !correct) return null;
      const order = shuffled(options.map((_, i) => i), random);
      return {
        ...exercise,
        data: { options: order.map((i) => options[i]) },
        answerKey: { correct: correct.map((c) => order.indexOf(c)).sort((a, b) => a - b) },
      };
    }
    case "matching": {
      const left = strings(data.left);
      const right = strings(data.right);
      const matches = numbers(answerKey.matches);
      if (!left || !right || !matches || matches.length !== left.length) return null;
      const leftOrder = shuffled(left.map((_, i) => i), random);
      const rightOrder = shuffled(right.map((_, i) => i), random);
      return {
        ...exercise,
        data: { left: leftOrder.map((i) => left[i]), right: rightOrder.map((i) => right[i]) },
        answerKey: { matches: leftOrder.map((i) => rightOrder.indexOf(matches[i])) },
      };
    }
    case "ordering": {
      const tokens = strings(data.tokens);
      if (!tokens || !strings(answerKey.tokens)) return null;
      return { ...exercise, data: { tokens: shuffled(tokens, random) } };
    }
    default:
      return null;
  }
}
