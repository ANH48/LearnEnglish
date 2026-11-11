import { z } from "zod";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-hashing";

// Shared by staff and learner account forms.

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`)
  .max(200);

export const accountFields = {
  // Trim first, then check the format, so "  a@b.com  " is accepted.
  email: z.string().trim().toLowerCase().max(200).pipe(z.email("Email không hợp lệ")),
  fullName: z.string().trim().min(1, "Bắt buộc").max(120),
  status: z.enum(["active", "locked"]),
  password,
  /** Empty string means "keep the current password". */
  optionalPassword: z.union([z.literal(""), password]),
};

/** Email stored on a soft-deleted account, freeing the real address for reuse. */
export function deletedEmail(email: string, id: string): string {
  return `${email}#deleted-${id}`;
}
