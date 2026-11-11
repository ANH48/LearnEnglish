import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { StaffForm } from "@/features/staff/staff-form";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("staff.manage");
  const { id } = await params;
  requireUuid(id);
  const [staff, groups] = await Promise.all([
    db.staff.findFirst({ where: { id, deletedAt: null }, include: { groups: true } }),
    db.permissionGroup.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!staff) notFound();
  if (staff.isSuperadmin && !actor.isSuperadmin) redirect("/admin/forbidden");

  return (
    <>
      <PageHeader title={`Sửa staff: ${staff.fullName}`} back={{ href: "/admin/staff", label: "Staff" }} />
      <StaffForm
        actorIsSuperadmin={actor.isSuperadmin}
        groups={groups}
        staff={{
          id: staff.id,
          email: staff.email,
          fullName: staff.fullName,
          status: staff.status,
          isSuperadmin: staff.isSuperadmin,
          groupIds: staff.groups.map((g) => g.groupId),
        }}
      />
    </>
  );
}
