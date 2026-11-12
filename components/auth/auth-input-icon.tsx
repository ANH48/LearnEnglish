import type { ReactNode } from "react";

/** Taller inputs with a leading icon, used by every sign-in form. */
export const authInputClass = "h-11 rounded-xl bg-white pl-10 text-base";

export function IconSlot({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3.5 z-10 grid place-items-center text-muted-foreground [&>svg]:size-4">{icon}</span>
      {children}
    </div>
  );
}
