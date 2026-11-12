import { ChevronLeft, Plus } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 grid gap-2">
      {back && (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-balance">{title}</h1>
          {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && (
          <Link href={action.href} className={cn(buttonVariants({ size: "lg" }), "h-10 rounded-xl px-4 shadow-md shadow-primary/20")}>
            <Plus className="size-4" />
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  published: "Đã xuất bản",
  active: "Hoạt động",
  locked: "Đã khóa",
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}
