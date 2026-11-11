"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requireCourseAccess, requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { type ActionState, isUniqueViolation, slugify, validationFailed } from "@/lib/forms/action-state";
import { uniqueIds } from "@/lib/forms/require-uuid";
import { canSeeAllCourses } from "@/lib/permissions/check-permission";

const courseSchema = z.object({
  title: z.string().trim().min(1, "Bắt buộc").max(160),
  slug: z.string().trim().max(180),
  description: z.string().trim().max(5000),
  status: z.enum(["draft", "published"]),
  categoryIds: z.array(z.uuid()),
  teacherIds: z.array(z.uuid()),
});

/**
 * Create (courseId = null) or update a course.
 * Teachers can only be changed by staff who see all courses; a course created
 * by anyone else is assigned to its creator, so it stays inside their scope.
 */
export async function saveCourseAction(
  courseId: string | null,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = courseId
    ? await requireCourseAccess("course.manage", courseId)
    : await requirePermission("course.manage");

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    status: formData.get("status"),
    categoryIds: formData.getAll("categoryIds"),
    teacherIds: formData.getAll("teacherIds"),
  });
  if (!parsed.success) return validationFailed(parsed.error);
  const input = parsed.data;

  const slug = slugify(input.slug || input.title);
  if (!slug) return { error: "Không tạo được đường dẫn từ tên này, hãy nhập đường dẫn bằng chữ không dấu." };

  // Only ids of categories and staff that still exist are kept.
  const [categories, teachers] = await Promise.all([
    db.category.findMany({ where: { id: { in: uniqueIds(input.categoryIds) }, deletedAt: null }, select: { id: true } }),
    db.staff.findMany({ where: { id: { in: uniqueIds(input.teacherIds) }, deletedAt: null }, select: { id: true } }),
  ]);
  const categoryIds = categories.map((c) => c.id);
  const managesTeachers = canSeeAllCourses(actor);
  const teacherIds = managesTeachers ? teachers.map((t) => t.id) : courseId ? null : [actor.id];
  const fields = { title: input.title, slug, description: input.description, status: input.status };

  let savedId: string;
  try {
    savedId = await db.$transaction(async (tx) => {
      const course = courseId
        ? await tx.course.update({ where: { id: courseId }, data: fields })
        : await tx.course.create({ data: { ...fields, createdBy: actor.id } });

      await tx.courseCategory.deleteMany({ where: { courseId: course.id } });
      await tx.courseCategory.createMany({
        data: categoryIds.map((categoryId) => ({ courseId: course.id, categoryId })),
      });

      if (teacherIds) {
        await tx.courseTeacher.deleteMany({ where: { courseId: course.id } });
        await tx.courseTeacher.createMany({
          data: teacherIds.map((staffId) => ({ courseId: course.id, staffId })),
        });
      }
      return course.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Đã có khóa học dùng đường dẫn này." };
    throw error;
  }

  // Who teaches a course decides who can see and edit it, so it is audited.
  if (teacherIds) await writeAuditLog(actor.id, "course.set_teachers", "course", savedId, { teacherIds });
  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${savedId}`);
}

export async function deleteCourseAction(courseId: string): Promise<void> {
  const actor = await requireCourseAccess("course.manage", courseId);
  const course = await db.course.findUniqueOrThrow({ where: { id: courseId } });

  // Soft delete keeps learners' scores; the slug is freed for reuse.
  await db.course.update({
    where: { id: courseId },
    data: { deletedAt: new Date(), slug: `${course.slug}--deleted-${course.id}` },
  });
  await writeAuditLog(actor.id, "course.delete", "course", courseId, { title: course.title });
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}
