import { z } from "zod";
import { ASSESSMENT_KINDS, type AssessmentKindName, FIXED_DURATION_MINUTES } from "@/lib/assessments/attempt-rules";
import { parseVietnamLocal } from "@/lib/datetime/vietnam-time";

/** What the assessment form submits. Times are `datetime-local` strings in Vietnam time. */
export const assessmentFormSchema = z.object({
  title: z.string().trim().min(1, "Bắt buộc").max(200),
  kind: z.enum(ASSESSMENT_KINDS as [AssessmentKindName, ...AssessmentKindName[]]),
  durationMinutes: z.coerce.number().int().min(1, "Tối thiểu 1 phút").max(300, "Tối đa 300 phút"),
  maxAttempts: z.coerce.number().int().min(1).max(20),
  opensAt: z.string(),
  closesAt: z.string(),
  status: z.enum(["draft", "published"]),
});

export type AssessmentFormInput = z.infer<typeof assessmentFormSchema>;

export type AssessmentFields = {
  title: string;
  kind: AssessmentKindName;
  durationMinutes: number;
  maxAttempts: number;
  opensAt: Date | null;
  closesAt: Date | null;
  status: "draft" | "published";
};

/**
 * Applies the rules each kind carries: 15- and 60-minute tests have a fixed
 * length, an exam needs an opening window and allows exactly one attempt, and
 * only exams keep a window at all.
 */
export function buildAssessmentFields(input: AssessmentFormInput): { ok: true; fields: AssessmentFields } | { ok: false; error: string } {
  const base = { title: input.title, kind: input.kind, status: input.status };
  const durationMinutes = FIXED_DURATION_MINUTES[input.kind] ?? input.durationMinutes;

  if (input.kind !== "exam") {
    return { ok: true, fields: { ...base, durationMinutes, maxAttempts: input.maxAttempts, opensAt: null, closesAt: null } };
  }

  const opensAt = parseVietnamLocal(input.opensAt);
  const closesAt = parseVietnamLocal(input.closesAt);
  if (!opensAt || !closesAt) return { ok: false, error: "Bài thi cần giờ mở và giờ đóng." };
  if (closesAt <= opensAt) return { ok: false, error: "Giờ đóng phải sau giờ mở." };
  return { ok: true, fields: { ...base, durationMinutes, maxAttempts: 1, opensAt, closesAt } };
}

/** Reads the question picker: ticked exercises with their points and order. Unticked rows are ignored. */
export function readPickedQuestions(formData: FormData): { exerciseId: string; points: number; order: number }[] | null {
  const picked = formData.getAll("exerciseId").map(String);
  const row = z.object({ exerciseId: z.uuid(), points: z.coerce.number().int().min(1).max(100), order: z.coerce.number().int().min(0).max(999) });
  const rows = [];
  for (const exerciseId of new Set(picked)) {
    const parsed = row.safeParse({ exerciseId, points: formData.get(`points-${exerciseId}`), order: formData.get(`order-${exerciseId}`) ?? 0 });
    if (!parsed.success) return null;
    rows.push(parsed.data);
  }
  // Stable sort: rows with the same order number keep the order they are listed in.
  return rows.sort((a, b) => a.order - b.order);
}
