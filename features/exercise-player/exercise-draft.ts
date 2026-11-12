import { BLANK } from "@/features/exercises/exercise-content";
import type { LearnerExercise } from "./learner-exercise";

/** The learner's in-progress answer; the fields used depend on the exercise type. */
export type Draft = {
  selected: number[];
  answers: string[];
  matches: number[];
  tokens: string[];
  /** Ordering only: which word buttons are already used. */
  used: number[];
  text: string;
};

export const emptyDraft = (exercise: LearnerExercise): Draft => ({
  selected: [],
  answers: (exercise.text ?? "").split(BLANK).slice(1).map(() => ""),
  matches: (exercise.left ?? []).map(() => -1),
  tokens: [],
  used: [],
  text: "",
});

/** What is sent to the server while the learner is still working; may be incomplete. Null when the type has no input. */
export function toPartialResponse(exercise: LearnerExercise, draft: Draft): unknown | null {
  switch (exercise.type) {
    case "multiple_choice":
    case "listening":
      return { selected: draft.selected };
    case "fill_blank":
      return { answers: draft.answers };
    case "matching":
      return { matches: draft.matches };
    case "ordering":
      return { tokens: draft.tokens };
    case "writing":
      return { text: draft.text };
    default:
      return null;
  }
}

/** The response for a practice submit, or null while the answer is incomplete. */
export function toResponse(exercise: LearnerExercise, draft: Draft): unknown | null {
  const complete: Record<string, boolean> = {
    multiple_choice: draft.selected.length > 0,
    listening: draft.selected.length > 0,
    fill_blank: draft.answers.every((a) => a.trim()),
    matching: draft.matches.every((m) => m >= 0),
    ordering: draft.tokens.length === (exercise.tokens ?? []).length,
    writing: draft.text.trim() !== "",
  };
  return complete[exercise.type] ? toPartialResponse(exercise, draft) : null;
}

const numbers = (value: unknown): number[] => (Array.isArray(value) ? value.filter((v) => typeof v === "number") : []);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v) => typeof v === "string") : []);

/** Rebuilds the draft from an answer saved earlier, so a reopened attempt shows what was typed. */
export function draftFromResponse(exercise: LearnerExercise, saved: unknown): Draft {
  const draft = emptyDraft(exercise);
  if (typeof saved !== "object" || saved === null) return draft;
  const response = saved as Record<string, unknown>;

  const tokens = strings(response.tokens);
  const used: number[] = [];
  for (const token of tokens) {
    // The same word can appear twice; take the first button not used yet.
    const index = (exercise.tokens ?? []).findIndex((t, i) => t === token && !used.includes(i));
    if (index >= 0) used.push(index);
  }

  return {
    selected: numbers(response.selected),
    answers: draft.answers.map((_, i) => strings(response.answers)[i] ?? ""),
    matches: draft.matches.map((_, i) => numbers(response.matches)[i] ?? -1),
    tokens: used.length === tokens.length ? tokens : [],
    used: used.length === tokens.length ? used : [],
    text: typeof response.text === "string" ? response.text : "",
  };
}
