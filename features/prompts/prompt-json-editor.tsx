"use client";

import { Braces } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parsePromptContent, promptContentToEditableJson } from "@/lib/prompt-store/prompt-schemas";

/** Where JSON.parse stopped, as "line X, column Y", read from the error's character position. */
function errorPlace(text: string, message: string): string {
  const position = Number(/position (\d+)/.exec(message)?.[1]);
  if (!Number.isFinite(position)) return "";
  const before = text.slice(0, position).split("\n");
  return ` (dòng ${before.length}, cột ${before[before.length - 1].length + 1})`;
}

function check(text: string): string | null {
  try {
    JSON.parse(text);
  } catch (error) {
    return `JSON sai cú pháp${errorPlace(text, (error as Error).message)}: ${(error as Error).message}`;
  }
  const parsed = parsePromptContent(text);
  return parsed.ok ? null : parsed.error;
}

/** The prompt JSON field: checked while typing, with a button to tidy the indentation. Submitted as `name`. */
export function PromptJsonEditor({ name, initialJson }: { name: string; initialJson: string }) {
  const [text, setText] = useState(initialJson);
  const problem = check(text);

  const tidy = () => {
    const parsed = parsePromptContent(text);
    if (parsed.ok) setText(promptContentToEditableJson(parsed.content));
  };

  return (
    <div className="grid gap-2">
      <Textarea
        id={name}
        name={name}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(40, Math.max(14, text.split("\n").length + 1))}
        required
        spellCheck={false}
        aria-invalid={problem !== null}
        aria-describedby={`${name}-status`}
        className="font-mono text-xs leading-5"
        onKeyDown={(e) => {
          // Tab indents instead of leaving the field, as in a code editor.
          if (e.key !== "Tab" || e.shiftKey) return;
          e.preventDefault();
          const el = e.currentTarget;
          const { selectionStart: start, selectionEnd: end } = el;
          setText(text.slice(0, start) + "  " + text.slice(end));
          requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={tidy} disabled={problem !== null}>
          <Braces aria-hidden /> Định dạng lại
        </Button>
        <p id={`${name}-status`} aria-live="polite" className={problem ? "text-sm text-destructive" : "text-sm text-emerald-700 dark:text-emerald-400"}>
          {problem ?? "JSON hợp lệ"}
        </p>
      </div>
    </div>
  );
}
