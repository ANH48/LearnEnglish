"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requireCustomer } from "@/lib/auth/current-customer";
import { requireCourseAccess, requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";
import { type EnrollmentEvent, nextEnrollmentStatus } from "./enrollment-state";

// ---------- Learner side ----------

async function learnerMove(courseId: string, event: "request" | "cancel"): Promise<void> {
  const customer = await requireCustomer();
  requireUuid(courseId);
  const course = await db.course.findFirst({
    where: { id: courseId, deletedAt: null, status: "published" },
    select: { id: true, slug: true },
  });
  if (!course) return;

  const existing = await db.enrollment.findUnique({
    where: { courseId_customerId: { courseId, customerId: customer.id } },
  });
  const status = nextEnrollmentStatus(existing?.status ?? null, event);
  if (!status) return;

  if (existing) {
    // A fresh request clears the previous review so the teacher sees it as new.
    // The status filter means a teacher's decision made in the meantime wins.
    await db.enrollment.updateMany({
      where: { id: existing.id, status: existing.status },
      data: { status, ...(event === "request" ? { reviewedBy: null, reviewedAt: null, note: "" } : {}) },
    });
  } else {
    // Two first requests at once: the second hits the unique key and is a no-op.
    await db.enrollment.createMany({ data: [{ courseId, customerId: customer.id, status }], skipDuplicates: true });
  }
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/learn");
}

export async function requestEnrollmentAction(courseId: string): Promise<void> {
  await learnerMove(courseId, "request");
}

export async function cancelEnrollmentAction(courseId: string): Promise<void> {
  await learnerMove(courseId, "cancel");
}

// ---------- Teacher side ----------

const note = z.string().trim().max(300);

/** Approve, reject or remove. The actor must have enrollment.review on that enrollment's course. */
export async function reviewEnrollmentAction(
  enrollmentId: string,
  event: Extract<EnrollmentEvent, "approve" | "reject" | "remove">,
  formData: FormData,
): Promise<void> {
  await requirePermission("enrollment.review");
  requireUuid(enrollmentId);
  if (event !== "approve" && event !== "reject" && event !== "remove") return;

  const enrollment = await db.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!enrollment) return;
  const actor = await requireCourseAccess("enrollment.review", enrollment.courseId);

  const status = nextEnrollmentStatus(enrollment.status, event);
  if (!status) return;
  const parsedNote = note.safeParse(formData.get("note") ?? "");

  // The status filter makes two teachers reviewing at once resolve to one outcome.
  const updated = await db.enrollment.updateMany({
    where: { id: enrollmentId, status: enrollment.status },
    data: { status, reviewedBy: actor.id, reviewedAt: new Date(), note: parsedNote.success ? parsedNote.data : "" },
  });
  if (updated.count === 1) {
    await writeAuditLog(actor.id, `enrollment.${event}`, "enrollment", enrollmentId, {
      courseId: enrollment.courseId,
      customerId: enrollment.customerId,
    });
  }
  revalidatePath("/admin/enrollments");
}
