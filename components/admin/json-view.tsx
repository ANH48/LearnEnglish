import { cn } from "@/lib/utils";

/** Strings (keys when followed by ":"), numbers and true/false/null, in the order they appear. */
const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

/** Read-only, pretty-printed JSON with colored keys and values. Long strings wrap instead of scrolling sideways. */
export function JsonView({ json, className }: { json: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const match of json.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(json.slice(last, index));
    const [, string, colon, number, literal] = match;
    if (string && colon) {
      parts.push(<span key={index} className="text-sky-700 dark:text-sky-300">{string}</span>, colon);
    } else if (string) {
      parts.push(<span key={index} className="text-emerald-700 dark:text-emerald-300">{string}</span>);
    } else if (number) {
      parts.push(<span key={index} className="text-amber-700 dark:text-amber-300">{number}</span>);
    } else if (literal) {
      parts.push(<span key={index} className="text-violet-700 dark:text-violet-300">{literal}</span>);
    }
    last = index + match[0].length;
  }
  parts.push(json.slice(last));

  return <pre className={cn("overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5 whitespace-pre-wrap break-words", className)}>{parts}</pre>;
}
