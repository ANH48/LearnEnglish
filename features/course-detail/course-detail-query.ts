import "server-only";
import type { ExerciseType } from "@prisma/client";
import { db } from "@/lib/db";
import { visible } from "@/lib/visible-content-filter";

/**
 * Everything the public course page shows, in one load. Only published, not
 * deleted content counts; lesson bodies and answers never leave the server here.
 */

export async function loadCourseDetail(slug: string) {
  const course = await db.course.findFirst({
    where: { slug, ...visible },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      updatedAt: true,
      categories: { select: { category: { select: { name: true, slug: true, deletedAt: true } } } },
      teachers: { where: { staff: { deletedAt: null } }, select: { staff: { select: { id: true, fullName: true } } } },
      lessons: {
        where: visible,
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, exercises: { where: visible, select: { type: true } } },
      },
      assessments: { where: visible, orderBy: { createdAt: "asc" }, select: { id: true, title: true, kind: true, durationMinutes: true } },
      exercises: { where: visible, select: { type: true } },
      _count: { select: { enrollments: { where: { status: "approved" } } } },
    },
  });
  if (!course) return null;

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    updatedAt: course.updatedAt,
    categories: course.categories.filter((c) => !c.category.deletedAt).map((c) => ({ name: c.category.name, slug: c.category.slug })),
    teachers: course.teachers.map((t) => t.staff),
    lessons: course.lessons.map((l) => ({ id: l.id, title: l.title, exerciseTypes: countTypes(l.exercises) })),
    assessments: course.assessments,
    exerciseTypes: countTypes(course.exercises),
    exerciseCount: course.exercises.length,
    learnerCount: course._count.enrollments,
  };
}

export type CourseDetail = NonNullable<Awaited<ReturnType<typeof loadCourseDetail>>>;
export type TypeCounts = Partial<Record<ExerciseType, number>>;

function countTypes(items: { type: ExerciseType }[]): TypeCounts {
  const counts: TypeCounts = {};
  for (const { type } of items) counts[type] = (counts[type] ?? 0) + 1;
  return counts;
}
