"use client";

import { useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { WritingPhotoOcr } from "@/features/writing-ocr/writing-photo-ocr";
import type { Draft } from "./exercise-draft";
import type { LearnerExercise } from "./learner-exercise";

type Props = {
  exercise: LearnerExercise;
  draft: Draft;
  onChange: (draft: Draft) => void;
  disabled: boolean;
  /** Where photos of a handwritten answer belong; without it the photo button is not shown. */
  ocr?: { attemptId: string | null };
};

const MAX_ANSWER = 10_000;

/** A writing answer: typed, or read from photos of a handwritten page and then corrected here. */
export function WritingAnswerInput({ exercise, draft, onChange, disabled, ocr }: Props) {
  // The text arrives after a long wait; append it to what is in the box then, not to an old copy.
  const latest = useRef(draft);
  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  const words = draft.text.trim() ? draft.text.trim().split(/\s+/).length : 0;
  const addText = (text: string) => {
    const current = latest.current.text.trim();
    onChange({ ...latest.current, text: (current ? `${current}\n\n${text}` : text).slice(0, MAX_ANSWER) });
  };

  return (
    <div className="grid gap-2">
      {ocr && !disabled && <WritingPhotoOcr attemptId={ocr.attemptId} exerciseId={exercise.id} disabled={disabled} onText={addText} />}
      <Textarea
        aria-label="Bài viết của bạn"
        rows={8}
        maxLength={MAX_ANSWER}
        disabled={disabled}
        value={draft.text}
        onChange={(e) => onChange({ ...draft, text: e.target.value })}
      />
      <p className="text-xs text-muted-foreground tabular-nums">
        {words} từ{exercise.minWords ? ` · tối thiểu ${exercise.minWords} từ` : ""} · teacher sẽ chấm bài này
      </p>
    </div>
  );
}
