import Link from "next/link";
import { cn } from "@/lib/utils";

/** Speech-bubble mark: a teal bubble with "Aa" and a warm dot, the site's logo. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-9 shrink-0", className)}>
      <rect width="40" height="40" rx="12" className="fill-primary" />
      <path d="M10 13.5a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-7l-5 4.5v-4.5a4 4 0 0 1-4-4z" fill="white" />
      <text x="20" y="21.5" textAnchor="middle" fontSize="9" fontWeight="800" fontFamily="var(--font-display)" className="fill-primary">
        Aa
      </text>
      <circle cx="31" cy="9" r="4" className="fill-brand-sun" />
    </svg>
  );
}

/** Mark plus name, linking home. */
export function BrandLogo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50", className)}>
      <BrandMark />
      <span className={cn("font-heading text-xl font-extrabold tracking-tight", tone === "light" ? "text-white" : "text-foreground")}>
        Learn<span className={tone === "light" ? "text-teal-300" : "text-primary"}>English</span>
      </span>
    </Link>
  );
}
