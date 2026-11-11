import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

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
    <div className="mb-6 grid gap-2">
      {back && (
        <Link href={back.href} className="text-sm text-muted-foreground hover:underline">
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {action && (
          <Link href={action.href} className={buttonVariants()}>
            {action.label}
          </Link>
        )}
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
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
