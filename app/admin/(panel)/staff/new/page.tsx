import { PageHeader } from "@/components/admin/page-header";
import { listGroups } from "@/features/groups/group-queries";
import { StaffForm } from "@/features/staff/staff-form";
import { requirePermission } from "@/lib/auth/current-staff";

export default async function NewStaffPage() {
  const actor = await requirePermission("staff.manage");
  const groups = await listGroups();

  return (
    <>
      <PageHeader title="Thêm staff" back={{ href: "/admin/staff", label: "Staff" }} />
      <StaffForm actorIsSuperadmin={actor.isSuperadmin} groups={groups} />
    </>
  );
}
