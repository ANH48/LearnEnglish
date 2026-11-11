"use client";

import { Button } from "@/components/ui/button";

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
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );
}
