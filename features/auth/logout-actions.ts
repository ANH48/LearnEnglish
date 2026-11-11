"use server";

import { redirect } from "next/navigation";
import { endSession } from "@/lib/auth/session-cookies";

export async function logoutStaffAction(): Promise<void> {
  await endSession("staff");
  redirect("/admin/login");
}

export async function logoutCustomerAction(): Promise<void> {
  await endSession("customer");
  redirect("/");
}
