import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function writeAuditLog(
  staffId: string,
  action: string,
  entity: string,
  entityId: string,
  detail: Prisma.InputJsonValue = {},
): Promise<void> {
  await db.auditLog.create({ data: { staffId, action, entity, entityId, detail } });
}
