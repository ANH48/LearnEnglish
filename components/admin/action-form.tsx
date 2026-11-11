"use client";

import { type ReactNode, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { type ActionState, EMPTY_ACTION_STATE } from "@/lib/forms/action-state";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel?: string;
  children: ReactNode;
};

/** Form wired to a server action, showing its validation errors above the fields. */
export function ActionForm({ action, submitLabel = "Lưu", children }: Props) {
  const [state, formAction, pending] = useActionState(action, EMPTY_ACTION_STATE);
  const fieldErrors = Object.entries(state.fieldErrors ?? {});

  return (
    <form
      className="grid max-w-2xl gap-4"
      // Submitting by hand keeps what the user typed when the server rejects the form
      // (a plain form action would reset every field).
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {state.error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p className="font-medium">{state.error}</p>
          {fieldErrors.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {fieldErrors.map(([field, messages]) => (
                <li key={field}>
                  {field}: {messages.join(", ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {children}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
