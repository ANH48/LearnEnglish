import { PageHeader } from "@/components/admin/page-header";
import { StaffForm } from "@/features/staff/staff-form";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";

export default async function NewStaffPage() {
  const actor = await requirePermission("staff.manage");
  const groups = await db.permissionGroup.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader title="Thêm staff" back={{ href: "/admin/staff", label: "Staff" }} />
      <StaffForm actorIsSuperadmin={actor.isSuperadmin} groups={groups} />
    </>
  );
}
