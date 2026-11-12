import { cn } from "@/lib/utils";

const TONES = ["bg-primary", "bg-brand-sun", "bg-brand-rose", "bg-sky-500", "bg-violet-500"];

/** Round avatar with the first letter of the given name (Vietnamese names: the last word). */
export function InitialAvatar({ name, className }: { name: string; className?: string }) {
  const word = name.trim().split(/\s+/).at(-1) ?? "";
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-10 shrink-0 place-items-center rounded-full font-heading font-extrabold text-white", TONES[Math.abs(hash) % TONES.length], className)}
    >
      {word[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
