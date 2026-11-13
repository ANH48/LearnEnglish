"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { EMPTY_ACTION_STATE } from "@/lib/forms/action-state";
import { startAttemptAction } from "./attempt-actions";

/** Starts (or resumes) an attempt and shows why when the server refuses. */
export function StartAttemptButton({ assessmentId, label }: { assessmentId: string; label: string }) {
  const [state, formAction, pending] = useActionState(startAttemptAction.bind(null, assessmentId), EMPTY_ACTION_STATE);
  return (
    <form action={formAction} className="grid gap-2">
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div>
        <SubmitButton>
          {pending ? "Đang mở…" : label}
        </SubmitButton>
      </div>
    </form>
  );
}
