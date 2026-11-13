"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Submit button for a `<form action>`: locked while the server action runs, with a spinner
 * in place of its icon. In a form with several `formAction` buttons only the pressed one spins.
 */
export function SubmitButton({ children, className, disabled, formAction, ...props }: ComponentProps<typeof Button>) {
  const status = useFormStatus();
  const busy = status.pending && (!formAction || status.action === formAction);
  return (
    <Button
      {...props}
      type="submit"
      formAction={formAction}
      disabled={disabled || status.pending}
      aria-busy={busy}
      className={cn("aria-busy:[&_svg:not(.animate-spin)]:hidden", className)}
    >
      {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  );
}

/** Icon of a plain submit `<button>`, swapped for a spinner while its form is sending. */
export function SubmitPendingIcon({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : children;
}
