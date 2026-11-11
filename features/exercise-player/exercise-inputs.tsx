"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BLANK } from "@/features/exercises/exercise-content";
import type { LearnerExercise } from "./learner-exercise";

/** The learner's in-progress answer; the fields used depend on the exercise type. */
export type Draft = { selected: number[]; answers: string[]; matches: number[]; tokens: string[]; used: number[] };

export const emptyDraft = (exercise: LearnerExercise): Draft => ({
  selected: [],
  answers: (exercise.text ?? "").split(BLANK).slice(1).map(() => ""),
  matches: (exercise.left ?? []).map(() => -1),
  tokens: [],
  used: [],
});

/** The response sent to the server, or null while the answer is incomplete. */
export function toResponse(exercise: LearnerExercise, draft: Draft): unknown | null {
  switch (exercise.type) {
    case "multiple_choice":
    case "listening":
      return draft.selected.length ? { selected: draft.selected } : null;
    case "fill_blank":
      return draft.answers.every((a) => a.trim()) ? { answers: draft.answers } : null;
    case "matching":
      return draft.matches.every((m) => m >= 0) ? { matches: draft.matches } : null;
    case "ordering":
      return draft.tokens.length === (exercise.tokens ?? []).length ? { tokens: draft.tokens } : null;
    default:
      return null;
  }
}

type Props = { exercise: LearnerExercise; draft: Draft; onChange: (draft: Draft) => void; disabled: boolean };
const selectClass = "h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm";

export function ExerciseInputs({ exercise, draft, onChange, disabled }: Props) {
  const name = `exercise-${exercise.id}`;

  if (exercise.type === "multiple_choice" || exercise.type === "listening") {
    const toggle = (index: number, checked: boolean) =>
      onChange({
        ...draft,
        selected: exercise.multiple
          ? checked
            ? [...draft.selected, index]
            : draft.selected.filter((i) => i !== index)
          : [index],
      });
    return (
      <div className="grid gap-2">
        {exercise.multiple && <p className="text-xs text-muted-foreground">Có thể chọn nhiều đáp án.</p>}
        {(exercise.options ?? []).map((option, index) => (
          <label key={index} className="flex items-center gap-2 rounded-lg border p-2 text-sm has-checked:border-primary">
            <input
              type={exercise.multiple ? "checkbox" : "radio"}
              name={name}
              disabled={disabled}
              checked={draft.selected.includes(index)}
              onChange={(e) => toggle(index, e.target.checked)}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (exercise.type === "fill_blank") {
    const pieces = (exercise.text ?? "").split(BLANK);
    return (
      <p className="leading-10">
        {pieces.map((piece, index) => (
          <span key={index}>
            {piece}
            {index < pieces.length - 1 && (
              <Input
                aria-label={`Chỗ trống ${index + 1}`}
                className="mx-1 inline-block h-8 w-32"
                disabled={disabled}
                value={draft.answers[index] ?? ""}
                onChange={(e) => onChange({ ...draft, answers: draft.answers.map((a, i) => (i === index ? e.target.value : a)) })}
              />
            )}
          </span>
        ))}
      </p>
    );
  }

  if (exercise.type === "matching") {
    return (
      <div className="grid gap-2">
        {(exercise.left ?? []).map((left, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-32 shrink-0 font-medium">{left}</span>
            <select
              aria-label={`Ghép với ${left}`}
              className={selectClass}
              disabled={disabled}
              value={draft.matches[index]}
              onChange={(e) => onChange({ ...draft, matches: draft.matches.map((m, i) => (i === index ? Number(e.target.value) : m)) })}
            >
              <option value={-1}>Chọn…</option>
              {(exercise.right ?? []).map((right, i) => (
                <option key={i} value={i}>
                  {right}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  if (exercise.type === "ordering") {
    const tokens = exercise.tokens ?? [];
    return (
      <div className="grid gap-3">
        <div className="min-h-10 rounded-lg border border-dashed p-2 text-sm">
          {draft.tokens.length ? draft.tokens.join(" ") : <span className="text-muted-foreground">Chạm vào từ bên dưới theo đúng thứ tự.</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {tokens.map((token, index) => (
            <Button
              key={index}
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || draft.used.includes(index)}
              onClick={() => onChange({ ...draft, tokens: [...draft.tokens, token], used: [...draft.used, index] })}
            >
              {token}
            </Button>
          ))}
          <Button type="button" size="sm" variant="ghost" disabled={disabled || draft.tokens.length === 0} onClick={() => onChange({ ...draft, tokens: [], used: [] })}>
            Làm lại
          </Button>
        </div>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">Loại bài này do teacher chấm và sẽ mở ở phần bài kiểm tra.</p>;
}
