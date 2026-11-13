import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { listGroups } from "@/features/groups/group-queries";
import { StaffForm } from "@/features/staff/staff-form";
import { findStaffWithGroups } from "@/features/staff/staff-queries";
import { requirePermission } from "@/lib/auth/current-staff";
import { requireUuid } from "@/lib/forms/require-uuid";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("staff.manage");
  const { id } = await params;
  requireUuid(id);
  const [staff, groups] = await Promise.all([
    findStaffWithGroups(id),
    listGroups(),
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
