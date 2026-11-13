import { z } from "zod";

/**
 * Shapes of the AI prompt store (MongoDB). Pure, so forms, the store and tests share them.
 *   prompt_categories  one per prompt key: its type, the model to call, the version in use
 *   prompts            one per key + version: the prompt JSON, never edited after creation
 *   prompt_runs        one per call: which key, version and model ran, and how it ended
 */

export const promptKeySchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9_]{2,59}$/, "Key: lowercase letters, digits and _, 3-60 characters, e.g. ocr_image_to_text");

export const promptVersionSchema = z
  .string()
  .trim()
  .regex(/^\d{1,4}\.\d{1,4}\.\d{1,4}$/, "Version: major.minor.patch, e.g. 1.0.0");

export const promptCategorySchema = z.object({
  key: promptKeySchema,
  type: z.string().trim().regex(/^[a-z][a-z0-9_]{1,39}$/, "Type: lowercase letters, digits and _, e.g. ocr"),
  name: z.string().trim().min(1, "Required").max(120),
  description: z.string().trim().max(1000).default(""),
  model: z.string().trim().min(1, "Required").max(120),
});

/** Request options a prompt may set; anything else is refused so a prompt cannot change the endpoint or the auth. */
const promptParamsSchema = z
  .object({
    temperature: z.number().min(0).max(2),
    top_p: z.number().min(0).max(1),
    max_completion_tokens: z.number().int().min(1).max(32_768),
    reasoning_effort: z.enum(["none", "default", "low", "medium", "high"]),
    reasoning_format: z.enum(["hidden", "raw", "parsed"]),
    seed: z.number().int(),
  })
  .partial()
  .strict();

/**
 * A prompt text, stored and edited as an array of lines (one item per line, "" for a blank line),
 * so it reads like text in JSON. A single string is accepted too and split into lines.
 * The lines are joined with "\n" only when the model is called (promptText()).
 */
const promptLines = z
  .union([z.string(), z.array(z.string().max(2_000)).min(1)])
  .transform((value) => (Array.isArray(value) ? value : value.split("\n")))
  .refine((lines) => lines.join("\n").trim().length > 0, "Must not be empty")
  .refine((lines) => lines.join("\n").length <= 20_000, "At most 20,000 characters")
  .refine((lines) => lines.length <= 500, "At most 500 lines");

/** The prompt JSON a teacher edits. `{{name}}` placeholders in `user` are filled by the caller. */
export const promptContentSchema = z
  .object({
    system: promptLines,
    user: promptLines,
    /** json_object: the model must answer with one JSON object (the caller says which fields). */
    responseFormat: z.enum(["text", "json_object"]).default("text"),
    params: promptParamsSchema.default({}),
  })
  .strict();

export type PromptCategoryInput = z.infer<typeof promptCategorySchema>;
export type PromptContent = z.infer<typeof promptContentSchema>;

export type PromptCategory = PromptCategoryInput & { activeVersion: string | null; createdAt: Date; updatedAt: Date };
export type PromptVersion = { key: string; version: string; content: PromptContent; note: string; createdAt: Date; createdBy: string };
export type PromptRunStatus = "ok" | "error" | "timeout";
export type PromptRun = {
  key: string;
  version: string;
  model: string;
  status: PromptRunStatus;
  error?: string;
  latencyMs: number;
  /** Who triggered it: `customer:<id>` or `staff:<id>`. */
  actor: string;
  /** Small facts about the input, never the input itself (no learner text or images). */
  subject: Record<string, string | number | null>;
  createdAt: Date;
};

/** Parses the JSON text typed in the editor; returns a readable error instead of throwing. */
export function parsePromptContent(json: string): { ok: true; content: PromptContent } | { ok: false; error: string } {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { ok: false, error: "Not valid JSON." };
  }
  const parsed = promptContentSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${issue?.path.join(".") || "prompt"}: ${issue?.message ?? "invalid"}` };
  }
  return { ok: true, content: parsed.data };
}

/** The text sent to the model: the stored lines joined. */
export function promptText(lines: string[]): string {
  return lines.join("\n").trim();
}

/** The prompt JSON shown and edited in admin: the same shape as stored. */
export function promptContentToEditableJson(content: PromptContent | Record<string, unknown>): string {
  return JSON.stringify(content, null, 2);
}

/** Fills `{{name}}` placeholders; unknown names are left as they are so a typo is visible in the trace. */
export function fillPlaceholders(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, name: string) => (Object.hasOwn(values, name) ? values[name] : match));
}

/** The next patch number after the highest version, "1.0.0" when there is none. */
export function nextPatchVersion(versions: string[]): string {
  const [highest] = [...versions].sort(compareVersionsDesc);
  if (!highest) return "1.0.0";
  const [major, minor, patch] = highest.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

/** Versions sorted newest first by number, not by text ("1.10.0" after "1.9.0"). */
export function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return (pb[i] ?? 0) - (pa[i] ?? 0);
  return 0;
}
