import { z } from "zod";

/** What a form server action returns to useActionState. */
export type ActionState = { error?: string; fieldErrors?: Record<string, string[]> };

export const EMPTY_ACTION_STATE: ActionState = {};

export function validationFailed(error: z.ZodError): ActionState {
  return {
    error: "Dữ liệu chưa hợp lệ, vui lòng kiểm tra lại.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

/** Prisma unique-constraint violation (P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
