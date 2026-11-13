import "server-only";
import { db } from "@/lib/db";

/** Every staff account, oldest first, with the names of its permission groups. */
export function listStaffWithGroups() {
  return db.staff.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { groups: { include: { group: true } } },
  });
}

export function findStaffWithGroups(id: string) {
  return db.staff.findFirst({ where: { id, deletedAt: null }, include: { groups: true } });
}
