/**
 * What a learner or a visitor may see of a course, lesson, exercise or
 * assessment: published and not soft-deleted. Spread it into a Prisma `where`.
 */
export const visible = { deletedAt: null, status: "published" } as const;
