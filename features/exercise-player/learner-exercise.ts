import { isAutoGraded } from "@/lib/grading/grade-exercise";

/**
 * What a learner's browser receives for an exercise. Built field by field from
 * `data` only, so nothing from the answer key can leak by accident.
 */
export type LearnerExercise = {
  id: string;
  type: string;
  prompt: string;
  points: number;
  /** False for writing and speaking, which a teacher grades. */
  autoGraded: boolean;
  options?: string[];
  /** Whether more than one option may be ticked. */
  multiple?: boolean;
  text?: string;
  left?: string[];
  right?: string[];
  tokens?: string[];
  /** Writing only: the length the teacher asks for. */
  minWords?: number;
  /** Speaking only: the longest recording allowed. */
  maxSeconds?: number;
};

type StoredExercise = { id: string; type: string; prompt: string; points: number; data: unknown; answerKey: unknown };

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v) => typeof v === "string") : []);

export function toLearnerExercise(exercise: StoredExercise): LearnerExercise {
  const data = (exercise.data ?? {}) as Record<string, unknown>;
  const base: LearnerExercise = {
    id: exercise.id,
    type: exercise.type,
    prompt: exercise.prompt,
    points: exercise.points,
    autoGraded: isAutoGraded(exercise.type),
  };

  switch (exercise.type) {
    case "multiple_choice":
    case "listening": {
      const correct = (exercise.answerKey as { correct?: unknown[] } | null)?.correct;
      return { ...base, options: strings(data.options), multiple: Array.isArray(correct) && correct.length > 1 };
    }
    case "fill_blank":
      return { ...base, text: typeof data.text === "string" ? data.text : "" };
    case "matching":
      return { ...base, left: strings(data.left), right: strings(data.right) };
    case "ordering":
      return { ...base, tokens: strings(data.tokens) };
    case "writing":
      return { ...base, minWords: typeof data.minWords === "number" ? data.minWords : 0 };
    case "speaking":
      return { ...base, maxSeconds: typeof data.maxSeconds === "number" ? data.maxSeconds : 60 };
    default:
      return base;
  }
}

/** Shown after the learner submits: the right answer in a readable form. */
export function solutionText(exercise: StoredExercise): string {
  try {
    return solutionUnchecked(exercise);
  } catch {
    return ""; // malformed stored key: show no solution rather than fail the submit
  }
}

function solutionUnchecked(exercise: StoredExercise): string {
  const data = (exercise.data ?? {}) as Record<string, unknown>;
  const key = (exercise.answerKey ?? {}) as Record<string, unknown>;
  switch (exercise.type) {
    case "multiple_choice":
    case "listening":
      return (key.correct as number[]).map((i) => strings(data.options)[i]).join("; ");
    case "fill_blank":
      return (key.answers as string[][]).map((options) => options.join(" / ")).join("; ");
    case "matching":
      return strings(data.left)
        .map((left, i) => {
          const right = strings(data.right)[(key.matches as number[])[i]];
          if (right === undefined) throw new Error("matching key does not cover every pair");
          return `${left} = ${right}`;
        })
        .join("; ");
    case "ordering":
      return strings(key.tokens).join(" ");
    default:
      return "";
  }
}

/** A stored response in a readable form, for result pages and for the teacher. Empty when nothing was answered. */
export function responseText(exercise: StoredExercise, response: unknown): string {
  const data = (exercise.data ?? {}) as Record<string, unknown>;
  const given = (typeof response === "object" && response !== null ? response : {}) as Record<string, unknown>;
  const indexes = (value: unknown): number[] => (Array.isArray(value) ? value.filter((v) => typeof v === "number") : []);
  switch (exercise.type) {
    case "multiple_choice":
    case "listening":
      return indexes(given.selected).map((i) => strings(data.options)[i] ?? "").filter(Boolean).join("; ");
    case "fill_blank":
      return strings(given.answers).some((a) => a.trim()) ? strings(given.answers).map((a) => a.trim() || "(trống)").join("; ") : "";
    case "matching": {
      const matches = indexes(given.matches);
      return strings(data.left)
        .map((left, i) => (matches[i] >= 0 && strings(data.right)[matches[i]] !== undefined ? `${left} = ${strings(data.right)[matches[i]]}` : ""))
        .filter(Boolean)
        .join("; ");
    }
    case "ordering":
      return strings(given.tokens).join(" ");
    case "writing":
      return typeof given.text === "string" ? given.text : "";
    default:
      return "";
  }
}
