"use client";

import { SubmitButton } from "@/components/shared/submit-button";

type Props = {
  action: () => Promise<void>;
  label: string;
  confirmMessage?: string;
  variant?: "destructive" | "outline" | "ghost";
};

/** Small button that runs a server action, asking first when a message is given. */
export function ConfirmActionButton({ action, label, confirmMessage, variant = "outline" }: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <SubmitButton size="sm" variant={variant}>
        {label}
      </SubmitButton>
    </form>
  );
}
