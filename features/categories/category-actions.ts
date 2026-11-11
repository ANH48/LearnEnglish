"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";
import { type ActionState, isUniqueViolation, slugify, validationFailed } from "@/lib/forms/action-state";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Bắt buộc").max(80),
  slug: z.string().trim().max(100),
});

/** Create (categoryId = null) or update a category. An empty slug is derived from the name. */
export async function saveCategoryAction(
  categoryId: string | null,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission("category.manage");
  if (categoryId !== null) requireUuid(categoryId);
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
  });
  if (!parsed.success) return validationFailed(parsed.error);

  const name = parsed.data.name;
  const slug = slugify(parsed.data.slug || name);
  if (!slug) return { error: "Không tạo được đường dẫn từ tên này, hãy nhập đường dẫn bằng chữ không dấu." };

  try {
    if (categoryId) {
      // updateMany + deletedAt filter: saving a stale tab must not revive a deleted category.
      const updated = await db.category.updateMany({ where: { id: categoryId, deletedAt: null }, data: { name, slug } });
      if (updated.count === 0) return { error: "Không tìm thấy thể loại." };
    } else {
      await db.category.create({ data: { name, slug } });
    }
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Đã có thể loại dùng đường dẫn này." };
    throw error;
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function deleteCategoryAction(categoryId: string): Promise<void> {
  const actor = await requirePermission("category.manage");
  requireUuid(categoryId);
  const category = await db.category.findFirst({ where: { id: categoryId, deletedAt: null } });
  if (!category) return;

  await db.$transaction([
    db.courseCategory.deleteMany({ where: { categoryId } }),
    db.category.update({
      where: { id: categoryId },
      // Free the slug so a new category can reuse it.
      data: { deletedAt: new Date(), slug: `${category.slug}--deleted-${category.id}` },
    }),
  ]);
  await writeAuditLog(actor.id, "category.delete", "category", categoryId);
  revalidatePath("/admin/categories");
}
