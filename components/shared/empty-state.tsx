import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Friendly placeholder for a list with nothing in it. */
export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
        <Icon className="size-6" />
      </span>
      <p className="font-heading font-bold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
