import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSession } from "./session-cookies";

export type CurrentCustomer = { id: string; email: string; fullName: string };

/** The signed-in learner, re-read from the database on every request (same rules as staff). */
export const getCurrentCustomer = cache(async (): Promise<CurrentCustomer | null> => {
  const session = await readSession("customer");
  if (!session) return null;

  const customer = await db.customer.findFirst({
    where: { id: session.sub, deletedAt: null, status: "active" },
    select: { id: true, email: true, fullName: true, tokenVersion: true },
  });
  if (!customer || customer.tokenVersion !== session.tv) return null;
  return { id: customer.id, email: customer.email, fullName: customer.fullName };
});

export async function requireCustomer(): Promise<CurrentCustomer> {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");
  return customer;
}

/**
 * The gate for every page and action that shows course content to a learner:
 * the course must be published and the learner's enrollment approved.
 * Anything else looks like the course does not exist.
 */
export async function requireApprovedCourse(courseSlug: string) {
  const customer = await requireCustomer();
  const course = await db.course.findFirst({
    where: {
      slug: courseSlug,
      deletedAt: null,
      status: "published",
      enrollments: { some: { customerId: customer.id, status: "approved" } },
    },
    select: { id: true, slug: true, title: true, description: true },
  });
  if (!course) notFound();
  return { customer, course };
}
