"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/current-customer";
import { db } from "@/lib/db";

const uuid = z.uuid();

/** Marks a lesson done or not done for the signed-in learner (approved enrollment required). */
export async function setLessonCompletedAction(lessonId: string, completed: boolean): Promise<void> {
  const customer = await requireCustomer();
  if (!uuid.safeParse(lessonId).success) return;

  const lesson = await db.lesson.findFirst({
    where: {
      id: lessonId,
      deletedAt: null,
      status: "published",
      course: {
        deletedAt: null,
        status: "published",
        enrollments: { some: { customerId: customer.id, status: "approved" } },
      },
    },
    select: { id: true, course: { select: { slug: true } } },
  });
  if (!lesson) return;

  const key = { customerId_lessonId: { customerId: customer.id, lessonId } };
  if (completed === true) {
    await db.lessonProgress.upsert({ where: key, update: {}, create: { customerId: customer.id, lessonId } });
  } else {
    await db.lessonProgress.deleteMany({ where: { customerId: customer.id, lessonId } });
  }
  revalidatePath(`/learn/${lesson.course.slug}`, "layout");
  revalidatePath("/learn");
}
