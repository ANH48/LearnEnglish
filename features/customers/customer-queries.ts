import "server-only";
import { db } from "@/lib/db";

export function listCustomers() {
  return db.customer.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } });
}

export function findCustomer(id: string) {
  return db.customer.findFirst({ where: { id, deletedAt: null } });
}
