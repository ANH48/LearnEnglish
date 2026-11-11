import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** Shared look for native <select> elements, matching the shadcn inputs. */
export const nativeSelectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function FormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A list of checkboxes submitted under one field name. */
export function CheckboxList({
  name,
  options,
  selected,
}: {
  name: string;
  options: { value: string; label: string; hint?: string }[];
  selected: string[];
}) {
  if (options.length === 0) return <p className="text-sm text-muted-foreground">Chưa có lựa chọn nào.</p>;
  return (
    <div className="grid gap-2">
      {options.map((option) => (
        <label key={option.value} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name={name}
            value={option.value}
            defaultChecked={selected.includes(option.value)}
            className="mt-1"
          />
          <span>
            {option.label}
            {option.hint && <span className="block text-xs text-muted-foreground">{option.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
