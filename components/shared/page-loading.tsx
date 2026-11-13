import { Loader2 } from "lucide-react";

/** Placeholder shown in the content area while a page reads its data. */
export function PageLoading() {
  return (
    <div role="status" className="grid min-h-[40vh] place-items-center">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
        Đang tải…
      </p>
    </div>
  );
}
