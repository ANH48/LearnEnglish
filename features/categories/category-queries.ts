import "server-only";
import { db } from "@/lib/db";

/** Every category with how many live courses use it. */
export function listCategoriesWithCourseCount() {
  return db.category.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: { where: { course: { deletedAt: null } } } } } },
  });
}

export function findCategory(id: string) {
  return db.category.findFirst({ where: { id, deletedAt: null } });
}
